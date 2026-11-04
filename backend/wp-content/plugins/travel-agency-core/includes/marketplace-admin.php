<?php
/**
 * wp-admin → Marketplace: where the team runs the platform.
 *
 * - Business requests: suppliers who asked to be verified. Approve or ask for changes.
 * - Listing requests: listings submitted by businesses. Approve (publish) or send back.
 * - Businesses: every supplier account, its status, listings and public page.
 * - Listings in our name: listings owned by staff, not a business. In marketplace mode
 *   they are hidden from the site; assign each one to a business to show it again.
 *
 * Every action emails the business, so they know what happened.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_MARKETPLACE_PAGE = 'tac-marketplace';

/** Only listings owned by a business are public (Agency details → Marketplace). */
function tac_marketplace_only() {
	return (bool) ( tac_settings()['marketplace_only'] ?? true );
}

/** Ids of suppliers whose listings can be public: business accounts that are not suspended. */
function tac_public_author_ids() {
	static $ids = null;
	if ( null === $ids ) {
		$ids = array_map( 'intval', get_users( array( 'role' => TAC_SUPPLIER_ROLE, 'fields' => 'ID', 'number' => -1 ) ) );
		$ids = array_values( array_diff( $ids, tac_suspended_user_ids() ) );
	}
	return $ids;
}

/** WP_Query args that keep hidden listings off the public site. */
function tac_public_author_args() {
	if ( ! tac_marketplace_only() ) {
		return array( 'author__not_in' => tac_suspended_user_ids() );
	}
	// An empty author__in means "anyone" to WordPress: use an impossible id instead.
	return array( 'author__in' => tac_public_author_ids() ? tac_public_author_ids() : array( -1 ) );
}

/** True when a published listing must not be shown or booked (suspended, or not a business's). */
function tac_listing_hidden( WP_Post $post ) {
	if ( tac_is_suspended( $post->post_author ) ) {
		return true;
	}
	return tac_marketplace_only() && ! in_array( (int) $post->post_author, tac_public_author_ids(), true );
}

/** Set a business's verification and email them. Used by the Marketplace page and the user screen. */
function tac_set_supplier_verification( $user_id, $status, $note = '' ) {
	$old = tac_supplier_status( $user_id );
	update_user_meta( $user_id, 'sp_verification', $status );
	update_user_meta( $user_id, 'sp_verification_note', $note );
	if ( $status === $old || ! in_array( $status, array( 'verified', 'rejected' ), true ) ) {
		return;
	}
	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return;
	}
	wp_mail(
		$user->user_email,
		'verified' === $status
			? sprintf( '[%s] Your business is approved', tac_site_name() )
			: sprintf( '[%s] Your business profile needs changes', tac_site_name() ),
		( 'verified' === $status
			? "Your business is approved. Your listings show a Verified badge once they are published.\n"
			: "Please update your business profile, then request verification again.\n" ) . ( $note ? "\n" . $note . "\n" : '' ) . "\nYour dashboard: " . tac_frontend_url( '/supplier' )
	);
}

/** Send a listing back to its business as a draft, with a note (emailed). */
function tac_send_listing_back( $post_id, $note ) {
	$post = get_post( $post_id );
	if ( ! $post ) {
		return;
	}
	update_post_meta( $post_id, 'review_note', $note );
	wp_update_post( array( 'ID' => $post_id, 'post_status' => 'draft' ) );
	$author = get_userdata( (int) $post->post_author );
	if ( $author ) {
		wp_mail(
			$author->user_email,
			sprintf( '[%s] Changes needed: %s', tac_site_name(), $post->post_title ),
			sprintf( "Please update your listing \"%s\" and submit it again.\n\n%s\n\nYour listings: %s", $post->post_title, $note, tac_frontend_url( '/supplier/listings' ) )
		);
	}
}

/** Pending counts for the menu bubble. */
function tac_marketplace_counts() {
	$suppliers = get_users(
		array(
			'role'       => TAC_SUPPLIER_ROLE,
			'meta_key'   => 'sp_verification', // phpcs:ignore WordPress.DB.SlowDBQuery
			'meta_value' => 'pending', // phpcs:ignore WordPress.DB.SlowDBQuery
			'fields'     => 'ID',
		)
	);
	$listings  = get_posts( array( 'post_type' => 'tour', 'post_status' => 'pending', 'numberposts' => -1, 'fields' => 'ids' ) );
	return array( 'businesses' => count( $suppliers ), 'listings' => count( $listings ) );
}

// Staff land on the Marketplace after signing in.
add_filter(
	'login_redirect',
	function ( $redirect, $requested, $user ) {
		if ( $user instanceof WP_User && user_can( $user, 'edit_others_posts' ) && ( '' === $requested || admin_url() === $redirect ) ) {
			return admin_url( 'admin.php?page=' . TAC_MARKETPLACE_PAGE );
		}
		return $redirect;
	},
	20,
	3
);

if ( ! is_admin() ) {
	return;
}

add_action(
	'admin_menu',
	function () {
		$counts = tac_marketplace_counts();
		$total  = $counts['businesses'] + $counts['listings'] + ( function_exists( 'tac_unread_messages' ) ? count( tac_unread_messages( 'team' ) ) : 0 );
		$bubble = $total ? ' <span class="awaiting-mod count-' . $total . '"><span class="pending-count">' . $total . '</span></span>' : '';
		add_menu_page(
			__( 'Marketplace', 'travel-agency-core' ),
			__( 'Marketplace', 'travel-agency-core' ) . $bubble,
			'edit_others_posts',
			TAC_MARKETPLACE_PAGE,
			'tac_render_marketplace_page',
			'dashicons-store',
			2
		);
		add_submenu_page( TAC_MARKETPLACE_PAGE, __( 'Requests and businesses', 'travel-agency-core' ), __( 'Requests and businesses', 'travel-agency-core' ), 'edit_others_posts', TAC_MARKETPLACE_PAGE, 'tac_render_marketplace_page' );
		add_submenu_page( TAC_MARKETPLACE_PAGE, __( 'Clients', 'travel-agency-core' ), __( 'Clients', 'travel-agency-core' ), 'list_users', 'admin.php?page=' . TAC_MARKETPLACE_PAGE . '&tab=clients' );
	},
	9 // Before WordPress adds All listings and Booking activity under it.
);

add_action(
	'admin_menu',
	function () {
		add_submenu_page( TAC_MARKETPLACE_PAGE, __( 'Listing categories', 'travel-agency-core' ), __( 'Listing categories', 'travel-agency-core' ), 'manage_categories', 'edit-tags.php?taxonomy=tour_category&post_type=tour' );
	},
	20
);

// Keep Marketplace open in the menu on the categories screen.
add_filter(
	'parent_file',
	function ( $parent ) {
		global $current_screen;
		return $current_screen && 'tour_category' === $current_screen->taxonomy ? TAC_MARKETPLACE_PAGE : $parent;
	}
);


/* ---------- Actions (admin-post.php) ---------- */

add_action(
	'admin_post_tac_marketplace',
	function () {
		if ( ! current_user_can( 'edit_others_posts' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do this.', 'travel-agency-core' ), 403 );
		}
		check_admin_referer( 'tac_marketplace' );
		$do   = sanitize_key( wp_unslash( $_POST['do'] ?? '' ) );
		$id   = absint( $_POST['id'] ?? 0 );
		$note = sanitize_textarea_field( wp_unslash( $_POST['note'] ?? '' ) );
		$tab  = sanitize_key( wp_unslash( $_POST['tab'] ?? 'businesses' ) );
		$done = '';

		switch ( $do ) {
			case 'approve_business':
				if ( tac_is_supplier( get_userdata( $id ) ) ) {
					tac_set_supplier_verification( $id, 'verified', $note );
					$done = 'business_approved';
				}
				break;
			case 'reject_business':
				if ( tac_is_supplier( get_userdata( $id ) ) ) {
					if ( '' === $note ) {
						$done = 'note_needed';
						break;
					}
					tac_set_supplier_verification( $id, 'rejected', $note );
					tac_add_message( $id, 'team', __( 'Changes needed before we can verify your business:', 'travel-agency-core' ) . "\n" . $note, get_current_user_id(), false );
					$done = 'business_rejected';
				}
				break;
			case 'approve_listing':
				$post = get_post( $id );
				if ( $post && 'tour' === $post->post_type ) {
					delete_post_meta( $id, 'review_note' );
					wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ) ); // Emails the business ("Your listing is live").
					$done = 'listing_approved';
				}
				break;
			case 'reject_listing':
				$post = get_post( $id );
				if ( $post && 'tour' === $post->post_type ) {
					if ( '' === $note ) {
						$done = 'note_needed';
						break;
					}
					tac_send_listing_back( $id, $note );
					tac_add_message( (int) $post->post_author, 'team', sprintf( /* translators: %s: listing */ __( 'Changes needed on your listing "%s":', 'travel-agency-core' ), $post->post_title ) . "\n" . $note, get_current_user_id(), false );
					$done = 'listing_rejected';
				}
				break;
			case 'assign_listing':
				$owner = absint( $_POST['owner'] ?? 0 );
				$post  = get_post( $id );
				if ( $post && 'tour' === $post->post_type && tac_is_supplier( get_userdata( $owner ) ) ) {
					wp_update_post( array( 'ID' => $id, 'post_author' => $owner ) );
					$done = 'listing_assigned';
				}
				break;
		}
		wp_safe_redirect( add_query_arg( array( 'page' => TAC_MARKETPLACE_PAGE, 'tab' => $tab, 'done' => $done ), admin_url( 'admin.php' ) ) );
		exit;
	}
);

/* ---------- Page ---------- */

function tac_marketplace_form( $do, $id, $tab, $label, $class = 'button', $note = false, $extra = '' ) {
	?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="tac-mp-form">
		<?php wp_nonce_field( 'tac_marketplace' ); ?>
		<input type="hidden" name="action" value="tac_marketplace">
		<input type="hidden" name="do" value="<?php echo esc_attr( $do ); ?>">
		<input type="hidden" name="id" value="<?php echo esc_attr( (string) $id ); ?>">
		<input type="hidden" name="tab" value="<?php echo esc_attr( $tab ); ?>">
		<?php echo $extra; // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts by the caller. ?>
		<?php if ( $note ) : ?>
			<textarea name="note" rows="2" required placeholder="<?php esc_attr_e( 'What should the business change? (emailed to them)', 'travel-agency-core' ); ?>"></textarea>
		<?php endif; ?>
		<button type="submit" class="<?php echo esc_attr( $class ); ?>"><?php echo esc_html( $label ); ?></button>
	</form>
	<?php
}

function tac_render_marketplace_page() {
	$tab    = sanitize_key( wp_unslash( $_GET['tab'] ?? 'businesses' ) ); // phpcs:ignore WordPress.Security.NonceVerification
	$done   = sanitize_key( wp_unslash( $_GET['done'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification
	$counts = tac_marketplace_counts();
	$own    = get_posts(
		array(
			'post_type'      => 'tour',
			'post_status'    => array( 'publish', 'pending', 'draft' ),
			'numberposts'    => -1,
			'author__not_in' => array_map( 'intval', get_users( array( 'role' => TAC_SUPPLIER_ROLE, 'fields' => 'ID', 'number' => -1 ) ) ) ?: array( -1 ),
		)
	);
	$tabs   = array(
		'businesses' => sprintf( /* translators: %d: count */ __( 'Business requests (%d)', 'travel-agency-core' ), $counts['businesses'] ),
		'listings'   => sprintf( /* translators: %d: count */ __( 'Listing requests (%d)', 'travel-agency-core' ), $counts['listings'] ),
		'all'        => __( 'All businesses', 'travel-agency-core' ),
		'clients'    => __( 'Clients', 'travel-agency-core' ),
		'own'        => sprintf( /* translators: %d: count */ __( 'Listings in our name (%d)', 'travel-agency-core' ), count( $own ) ),
	);
	$messages = array(
		'business_approved' => __( 'Business approved. They were emailed.', 'travel-agency-core' ),
		'business_rejected' => __( 'Changes requested. The business was emailed your note.', 'travel-agency-core' ),
		'listing_approved'  => __( 'Listing approved and live. The business was emailed.', 'travel-agency-core' ),
		'listing_rejected'  => __( 'Listing sent back. The business was emailed your note.', 'travel-agency-core' ),
		'listing_assigned'  => __( 'Listing moved to the business.', 'travel-agency-core' ),
		'note_needed'       => __( 'Write a note so the business knows what to change.', 'travel-agency-core' ),
	);
	?>
	<div class="wrap tac-mp">
		<style>
			.tac-mp-card{background:#fff;border:1px solid #dcdcde;border-radius:8px;padding:16px 18px;margin:12px 0;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px}
			.tac-mp-card h3{margin:0 0 6px;font-size:16px}
			.tac-mp-card dl{display:grid;grid-template-columns:150px 1fr;gap:4px 12px;margin:8px 0}
			.tac-mp-card dt{color:#646970}.tac-mp-card dd{margin:0}
			.tac-mp-actions{display:flex;flex-direction:column;gap:10px}
			.tac-mp-form{display:flex;flex-direction:column;gap:6px}
			.tac-mp-form textarea{width:100%}
			.tac-mp-missing{color:#b32d2e}
			.tac-mp-empty{background:#fff;border:1px solid #dcdcde;border-radius:8px;padding:24px;text-align:center;color:#646970}
			.tac-mp-thumb{width:120px;height:80px;object-fit:cover;border-radius:6px;float:left;margin:0 12px 6px 0}
			@media (max-width:900px){.tac-mp-card{grid-template-columns:1fr}}
		</style>
		<h1><?php esc_html_e( 'Marketplace', 'travel-agency-core' ); ?></h1>
		<p><?php esc_html_e( 'Approve the businesses and listings on the platform. Every decision is emailed to the business. Booking requests go to the business that owns the listing.', 'travel-agency-core' ); ?></p>
		<?php if ( isset( $messages[ $done ] ) ) : ?>
			<div class="notice <?php echo 'note_needed' === $done ? 'notice-error' : 'notice-success'; ?> is-dismissible"><p><?php echo esc_html( $messages[ $done ] ); ?></p></div>
		<?php endif; ?>
		<nav class="nav-tab-wrapper">
			<?php foreach ( $tabs as $key => $label ) : ?>
				<a href="<?php echo esc_url( add_query_arg( array( 'page' => TAC_MARKETPLACE_PAGE, 'tab' => $key ), admin_url( 'admin.php' ) ) ); ?>" class="nav-tab<?php echo $tab === $key ? ' nav-tab-active' : ''; ?>"><?php echo esc_html( $label ); ?></a>
			<?php endforeach; ?>
		</nav>
		<?php
		switch ( $tab ) {
			case 'listings':
				tac_mp_listings_tab();
				break;
			case 'all':
				tac_mp_all_tab();
				break;
			case 'clients':
				tac_mp_clients_tab();
				break;
			case 'own':
				tac_mp_own_tab( $own );
				break;
			default:
				tac_mp_businesses_tab();
		}
		?>
	</div>
	<?php
}

function tac_mp_business_details( WP_User $user ) {
	$m     = fn( $k ) => (string) tac_supplier_meta( $user->ID, $k );
	$types = tac_business_types();
	$docs  = tac_supplier_document_ids( $user->ID );
	$rows  = array(
		__( 'Logo', 'travel-agency-core' )             => ( $logo = wp_get_attachment_image_url( (int) $m( 'logo_id' ), 'thumbnail' ) ) ? '<img src="' . esc_url( $logo ) . '" alt="" style="max-height:56px;max-width:160px;background:#fff;border:1px solid #dcdcde;border-radius:6px;padding:4px"> <span class="description">' . esc_html__( 'Check it is the same as on their website.', 'travel-agency-core' ) . '</span>' : '<span class="tac-mp-missing">' . esc_html__( 'No logo yet', 'travel-agency-core' ) . '</span>',
		__( 'Website', 'travel-agency-core' )          => $m( 'website' ) ? '<a href="' . esc_url( $m( 'website' ) ) . '" target="_blank" rel="noopener">' . esc_html( $m( 'website' ) ) . '</a>' : '—',
		__( 'Page on the platform', 'travel-agency-core' ) => '<a href="' . esc_url( tac_frontend_url( '/provider/' . $user->user_nicename ) ) . '" target="_blank" rel="noopener">/provider/' . esc_html( $user->user_nicename ) . '</a>',
		__( 'Business type', 'travel-agency-core' )    => esc_html( $types[ $m( 'business_type' ) ] ?? '—' ),
		__( 'Contact', 'travel-agency-core' )          => esc_html( trim( $m( 'contact_name' ) . ' · ' . $user->user_email . ( $m( 'phone' ) ? ' · ' . $m( 'phone' ) : '' ), ' ·' ) ),
		__( 'Address', 'travel-agency-core' )          => nl2br( esc_html( $m( 'address' ) ?: '—' ) ),
		__( 'Operates in', 'travel-agency-core' )      => esc_html( implode( ', ', tac_lines( $m( 'operating_locations' ) ) ) ?: '—' ),
		__( 'Legal name / RC', 'travel-agency-core' )  => esc_html( trim( $m( 'legal_name' ) . ' ' . ( $m( 'registration_number' ) ? '(' . $m( 'registration_number' ) . ')' : '' ) ) ?: '—' ),
		__( 'Permits', 'travel-agency-core' )          => nl2br( esc_html( $m( 'permits' ) ?: '—' ) ),
		__( 'Documents', 'travel-agency-core' )        => $docs ? implode( '<br>', array_map( fn( $id ) => '<a href="' . esc_url( wp_get_attachment_url( $id ) ) . '" target="_blank" rel="noopener">' . esc_html( get_the_title( $id ) ) . '</a>', $docs ) ) : '—',
		__( 'Joined', 'travel-agency-core' )           => esc_html( mysql2date( get_option( 'date_format' ), $user->user_registered ) ),
	);
	echo '<dl>';
	foreach ( $rows as $label => $html ) {
		echo '<dt>' . esc_html( $label ) . '</dt><dd>' . $html . '</dd>'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above.
	}
	echo '</dl>';
	if ( $m( 'bio' ) ) {
		echo '<p>' . esc_html( wp_trim_words( $m( 'bio' ), 60 ) ) . '</p>';
	}
}

function tac_mp_businesses_tab() {
	$users = get_users(
		array(
			'role'       => TAC_SUPPLIER_ROLE,
			'meta_key'   => 'sp_verification', // phpcs:ignore WordPress.DB.SlowDBQuery
			'meta_value' => 'pending', // phpcs:ignore WordPress.DB.SlowDBQuery
			'orderby'    => 'registered',
		)
	);
	if ( ! $users ) {
		echo '<p class="tac-mp-empty">' . esc_html__( 'No business is waiting for approval.', 'travel-agency-core' ) . '</p>';
		return;
	}
	foreach ( $users as $user ) {
		$missing = array_filter( tac_supplier_checklist( $user->ID ), fn( $i ) => ! $i['done'] && ! $i['optional'] );
		?>
		<div class="tac-mp-card">
			<div>
				<h3><?php echo esc_html( $user->display_name ); ?> <?php echo tac_pill( 'wait', __( 'Waiting for approval', 'travel-agency-core' ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?></h3>
				<?php tac_mp_business_details( $user ); ?>
				<?php if ( $missing ) : ?>
					<p class="tac-mp-missing"><?php echo esc_html( __( 'Missing:', 'travel-agency-core' ) . ' ' . implode( ', ', wp_list_pluck( $missing, 'label' ) ) ); ?></p>
				<?php endif; ?>
				<p><a href="<?php echo esc_url( admin_url( 'user-edit.php?user_id=' . $user->ID . '#tac-supplier' ) ); ?>"><?php esc_html_e( 'Full profile', 'travel-agency-core' ); ?></a> · <a href="<?php echo esc_url( admin_url( 'admin.php?page=tac-messages&business=' . $user->ID ) ); ?>"><?php esc_html_e( 'Message this business', 'travel-agency-core' ); ?></a></p>
			</div>
			<div class="tac-mp-actions">
				<?php tac_marketplace_form( 'approve_business', $user->ID, 'businesses', __( 'Approve business', 'travel-agency-core' ), 'button button-primary' ); ?>
				<?php tac_marketplace_form( 'reject_business', $user->ID, 'businesses', __( 'Ask for changes', 'travel-agency-core' ), 'button', true ); ?>
			</div>
		</div>
		<?php
	}
}

function tac_mp_listings_tab() {
	$posts = get_posts( array( 'post_type' => 'tour', 'post_status' => 'pending', 'numberposts' => -1, 'orderby' => 'modified', 'order' => 'ASC' ) );
	if ( ! $posts ) {
		echo '<p class="tac-mp-empty">' . esc_html__( 'No listing is waiting for approval.', 'travel-agency-core' ) . '</p>';
		return;
	}
	$labels = array(
		'unverified' => __( 'Business not approved yet', 'travel-agency-core' ),
		'pending'    => __( 'Business waiting for approval', 'travel-agency-core' ),
		'verified'   => __( 'Approved business', 'travel-agency-core' ),
		'rejected'   => __( 'Business needs changes', 'travel-agency-core' ),
	);
	foreach ( $posts as $post ) {
		$author  = get_userdata( (int) $post->post_author );
		$status  = $author ? tac_supplier_status( $author->ID ) : 'unverified';
		$missing = tac_listing_missing( $post->ID );
		$cat     = tac_listing_category_of( $post->ID );
		$cat_def = $cat ? tac_listing_category( $cat ) : null;
		$image   = tac_image_url( $post->ID );
		$price   = get_post_meta( $post->ID, 'price', true );
		?>
		<div class="tac-mp-card">
			<div>
				<?php if ( $image ) : ?>
					<img class="tac-mp-thumb" src="<?php echo esc_url( $image ); ?>" alt="">
				<?php endif; ?>
				<h3><?php echo esc_html( $post->post_title ?: __( '(no title)', 'travel-agency-core' ) ); ?></h3>
				<p>
					<?php esc_html_e( 'By', 'travel-agency-core' ); ?>
					<strong><?php echo esc_html( $author ? $author->display_name : '—' ); ?></strong>
					<?php echo tac_pill( 'verified' === $status ? 'ok' : 'wait', $labels[ $status ] ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					<?php if ( $cat_def ) : ?>
						· <?php echo esc_html( $cat_def['name'] ?? $cat ); ?>
					<?php endif; ?>
					<?php if ( '' !== (string) $price ) : ?>
						· <?php echo esc_html( sprintf( /* translators: %s: price */ __( 'from %s', 'travel-agency-core' ), $price ) ); ?>
					<?php endif; ?>
					· <?php echo esc_html( sprintf( /* translators: %s: date */ __( 'submitted %s', 'travel-agency-core' ), mysql2date( get_option( 'date_format' ), $post->post_modified ) ) ); ?>
				</p>
				<p><?php echo esc_html( wp_trim_words( wp_strip_all_tags( $post->post_content ), 45 ) ); ?></p>
				<?php if ( $missing ) : ?>
					<p class="tac-mp-missing"><?php echo esc_html( __( 'Missing:', 'travel-agency-core' ) . ' ' . implode( ', ', wp_list_pluck( $missing, 'label' ) ) ); ?></p>
				<?php endif; ?>
				<p style="clear:both">
					<a href="<?php echo esc_url( get_preview_post_link( $post ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Preview', 'travel-agency-core' ); ?></a> ·
					<a href="<?php echo esc_url( admin_url( 'post.php?action=edit&post=' . $post->ID ) ); ?>"><?php esc_html_e( 'Open full listing', 'travel-agency-core' ); ?></a>
					<?php if ( $author ) : ?>
						· <a href="<?php echo esc_url( add_query_arg( array( 'page' => TAC_MARKETPLACE_PAGE, 'tab' => 'all' ), admin_url( 'admin.php' ) ) . '#b' . $author->ID ); ?>"><?php esc_html_e( 'Business details', 'travel-agency-core' ); ?></a>
					<?php endif; ?>
				</p>
			</div>
			<div class="tac-mp-actions">
				<?php tac_marketplace_form( 'approve_listing', $post->ID, 'listings', __( 'Approve and publish', 'travel-agency-core' ), 'button button-primary' ); ?>
				<?php tac_marketplace_form( 'reject_listing', $post->ID, 'listings', __( 'Send back for changes', 'travel-agency-core' ), 'button', true ); ?>
			</div>
		</div>
		<?php
	}
}

function tac_mp_all_tab() {
	$users = get_users( array( 'role' => TAC_SUPPLIER_ROLE, 'orderby' => 'display_name', 'number' => -1 ) );
	if ( ! $users ) {
		echo '<p class="tac-mp-empty">' . esc_html__( 'No business has joined yet.', 'travel-agency-core' ) . '</p>';
		return;
	}
	$labels = array(
		'unverified' => array( 'off', __( 'Not submitted', 'travel-agency-core' ) ),
		'pending'    => array( 'wait', __( 'Waiting for approval', 'travel-agency-core' ) ),
		'verified'   => array( 'ok', __( 'Approved', 'travel-agency-core' ) ),
		'rejected'   => array( 'off', __( 'Changes requested', 'travel-agency-core' ) ),
	);
	?>
	<table class="widefat striped" style="margin-top:12px">
		<thead><tr>
			<th><?php esc_html_e( 'Business', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Status', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Listings (live / waiting / draft)', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Website', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Page on the platform', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Actions', 'travel-agency-core' ); ?></th>
		</tr></thead>
		<tbody>
		<?php foreach ( $users as $user ) : ?>
			<?php
			$n   = fn( $s ) => count( get_posts( array( 'post_type' => 'tour', 'post_status' => $s, 'author' => $user->ID, 'numberposts' => -1, 'fields' => 'ids' ) ) );
			$l   = $labels[ tac_supplier_status( $user->ID ) ];
			$web = (string) tac_supplier_meta( $user->ID, 'website' );
			?>
			<tr id="b<?php echo esc_attr( (string) $user->ID ); ?>">
				<td><strong><?php echo esc_html( $user->display_name ); ?></strong><br><span class="description"><?php echo esc_html( $user->user_email ); ?></span></td>
				<td><?php echo tac_pill( $l[0], $l[1] ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php echo tac_is_suspended( $user->ID ) ? ' ' . tac_pill( 'suspended', __( 'Suspended', 'travel-agency-core' ) ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput ?></td>
				<td><?php echo esc_html( $n( 'publish' ) . ' / ' . $n( 'pending' ) . ' / ' . $n( 'draft' ) ); ?></td>
				<td><?php echo $web ? '<a href="' . esc_url( $web ) . '" target="_blank" rel="noopener">' . esc_html( preg_replace( '#^https?://(www\.)?#', '', $web ) ) . '</a>' : '—'; // phpcs:ignore WordPress.Security.EscapeOutput ?></td>
				<td><a href="<?php echo esc_url( tac_frontend_url( '/provider/' . $user->user_nicename ) ); ?>" target="_blank" rel="noopener">/provider/<?php echo esc_html( $user->user_nicename ); ?></a></td>
				<td>
					<a href="<?php echo esc_url( admin_url( 'user-edit.php?user_id=' . $user->ID . '#tac-supplier' ) ); ?>"><?php esc_html_e( 'Profile and verification', 'travel-agency-core' ); ?></a> ·
					<a href="<?php echo esc_url( admin_url( 'edit.php?post_type=tour&author=' . $user->ID ) ); ?>"><?php esc_html_e( 'Listings', 'travel-agency-core' ); ?></a> ·
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=tac-messages&business=' . $user->ID ) ); ?>"><?php esc_html_e( 'Message', 'travel-agency-core' ); ?></a>
				</td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<?php
}

function tac_mp_own_tab( array $posts ) {
	if ( tac_marketplace_only() ) {
		echo '<div class="notice notice-info inline"><p>' . esc_html__( 'Marketplace mode is on: these listings are hidden from the site and can\'t be booked. Move each one to the business that runs it, or delete it.', 'travel-agency-core' ) . '</p></div>';
	} else {
		echo '<div class="notice notice-warning inline"><p>' . esc_html__( 'Marketplace mode is off (Agency details): these listings are shown in the site\'s own name, and their booking requests come to you.', 'travel-agency-core' ) . '</p></div>';
	}
	if ( ! $posts ) {
		echo '<p class="tac-mp-empty">' . esc_html__( 'No listing is in the platform\'s name. Every listing belongs to a business.', 'travel-agency-core' ) . '</p>';
		return;
	}
	$suppliers = get_users( array( 'role' => TAC_SUPPLIER_ROLE, 'orderby' => 'display_name', 'number' => -1 ) );
	$options   = '<option value="">' . esc_html__( 'Choose a business…', 'travel-agency-core' ) . '</option>';
	foreach ( $suppliers as $s ) {
		$options .= '<option value="' . esc_attr( (string) $s->ID ) . '">' . esc_html( $s->display_name ) . '</option>';
	}
	?>
	<table class="widefat striped" style="margin-top:12px">
		<thead><tr>
			<th><?php esc_html_e( 'Listing', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Status', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Move to a business', 'travel-agency-core' ); ?></th>
		</tr></thead>
		<tbody>
		<?php foreach ( $posts as $post ) : ?>
			<tr>
				<td><a href="<?php echo esc_url( admin_url( 'post.php?action=edit&post=' . $post->ID ) ); ?>"><?php echo esc_html( $post->post_title ); ?></a></td>
				<td><?php echo esc_html( get_post_status_object( $post->post_status )->label ?? $post->post_status ); ?></td>
				<td>
					<?php if ( $suppliers ) : ?>
						<?php tac_marketplace_form( 'assign_listing', $post->ID, 'own', __( 'Move', 'travel-agency-core' ), 'button', false, '<select name="owner" required>' . $options . '</select>' ); ?>
					<?php else : ?>
						<span class="description"><?php esc_html_e( 'No business has joined yet.', 'travel-agency-core' ); ?></span>
					<?php endif; ?>
				</td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<?php
}

function tac_mp_clients_tab() {
	$users = get_users( array( 'role__in' => array( 'subscriber', TAC_HOST_ROLE ), 'orderby' => 'registered', 'order' => 'DESC', 'number' => 200 ) );
	if ( ! $users ) {
		echo '<p class="tac-mp-empty">' . esc_html__( 'No client account yet. Travellers can also book without an account.', 'travel-agency-core' ) . '</p>';
		return;
	}
	?>
	<p class="description" style="margin-top:12px"><?php esc_html_e( 'Traveller accounts. Their booking requests go to the businesses; you can follow them in Booking activity.', 'travel-agency-core' ); ?></p>
	<table class="widefat striped">
		<thead><tr>
			<th><?php esc_html_e( 'Client', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Joined', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Booking requests', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Sign-in', 'travel-agency-core' ); ?></th>
			<th><?php esc_html_e( 'Actions', 'travel-agency-core' ); ?></th>
		</tr></thead>
		<tbody>
		<?php foreach ( $users as $user ) : ?>
			<tr>
				<td><strong><?php echo esc_html( $user->display_name ); ?></strong><br><a href="mailto:<?php echo esc_attr( $user->user_email ); ?>"><?php echo esc_html( $user->user_email ); ?></a></td>
				<td><?php echo esc_html( mysql2date( get_option( 'date_format' ), $user->user_registered ) ); ?></td>
				<td><?php echo (int) count( tac_client_inquiries( $user ) ); ?></td>
				<td><?php echo get_user_meta( $user->ID, 'tac_google_sub', true ) ? 'Google' : esc_html__( 'Email', 'travel-agency-core' ); ?><?php echo tac_is_suspended( $user->ID ) ? ' ' . tac_pill( 'suspended', __( 'Suspended', 'travel-agency-core' ) ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput ?></td>
				<td><a href="<?php echo esc_url( admin_url( 'user-edit.php?user_id=' . $user->ID ) ); ?>"><?php esc_html_e( 'Account', 'travel-agency-core' ); ?></a></td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<p><a href="<?php echo esc_url( admin_url( 'users.php' ) ); ?>"><?php esc_html_e( 'All accounts (suspend or unsuspend from Users)', 'travel-agency-core' ); ?></a></p>
	<?php
}
