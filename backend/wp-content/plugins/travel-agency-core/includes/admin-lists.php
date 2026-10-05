<?php
/**
 * wp-admin list screens for running the site:
 * - Users: account type, listings and bookings, filters, suspend/unsuspend.
 * - Inquiries: listing, business, client, date, guests and status; status filter and editor.
 * - Listings: business and price columns, filter by business.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! is_admin() ) {
	return;
}

const TAC_STATUS_LABELS = array(
	'requested' => 'Waiting for reply',
	'confirmed' => 'Confirmed',
	'declined'  => 'Declined',
	'cancelled' => 'Cancelled',
);

add_action(
	'admin_head',
	function () {
		echo '<style>
			.tac-pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;background:#f0f0f1;color:#50575e}
			.tac-pill.requested{background:#fcf0d1;color:#6b4e00}
			.tac-pill.confirmed,.tac-pill.supplier{background:#fff1e6;color:#9a3412}
			.tac-pill.suspended{background:#fcf0f1;color:#b32d2e}
			.column-tac_status,.column-tac_type{width:130px}
			.column-tac_guests,.column-tac_listings,.column-tac_bookings{width:80px}
		</style>';
	}
);

function tac_pill( $class, $label ) {
	return '<span class="tac-pill ' . esc_attr( $class ) . '">' . esc_html( $label ) . '</span>';
}

/* ======================= Users ======================= */

add_filter(
	'manage_users_columns',
	function ( $cols ) {
		$cols['tac_type']     = __( 'Account', 'travel-agency-core' );
		$cols['tac_listings'] = __( 'Listings', 'travel-agency-core' );
		$cols['tac_bookings'] = __( 'Bookings', 'travel-agency-core' );
		unset( $cols['posts'] );
		return $cols;
	}
);

add_filter(
	'manage_users_custom_column',
	function ( $out, $col, $user_id ) {
		switch ( $col ) {
			case 'tac_type':
				if ( user_can( $user_id, 'manage_options' ) ) {
					return tac_pill( '', __( 'Site admin', 'travel-agency-core' ) );
				}
				$type = tac_account_type( $user_id );
				$out  = tac_pill( $type, 'supplier' === $type ? __( 'Business', 'travel-agency-core' ) : __( 'Traveller', 'travel-agency-core' ) );
				if ( tac_is_suspended( $user_id ) ) {
					$out .= ' ' . tac_pill( 'suspended', __( 'Suspended', 'travel-agency-core' ) );
				}
				return $out;
			case 'tac_listings':
				$n = count_user_posts( $user_id, 'tour' );
				return $n ? '<a href="' . esc_url( admin_url( 'edit.php?post_type=tour&author=' . $user_id ) ) . '">' . (int) $n . '</a>' : '0';
			case 'tac_bookings':
				$user = get_userdata( $user_id );
				$sent = count( tac_client_inquiries( $user ) );
				$got  = count( tac_inquiries( array( array( 'key' => 'owner_id', 'value' => $user_id, 'type' => 'NUMERIC' ) ) ) );
				$out  = (string) $sent;
				if ( $got ) {
					$out .= ' <span class="description">(' . sprintf(
						/* translators: %d: number of booking requests received */
						esc_html__( '%d received', 'travel-agency-core' ),
						$got
					) . ')</span>';
				}
				return $out;
		}
		return $out;
	},
	10,
	3
);

// "Travellers | Businesses | Suspended" links above the users table.
add_filter(
	'views_users',
	function ( $views ) {
		$base    = admin_url( 'users.php' );
		$current = isset( $_GET['tac_view'] ) ? sanitize_key( $_GET['tac_view'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		$count   = function ( $args ) {
			return count( get_users( array_merge( $args, array( 'fields' => 'ID' ) ) ) );
		};
		$items = array(
			'supplier'  => array( __( 'Businesses', 'travel-agency-core' ), $count( array( 'meta_key' => 'tac_account_type', 'meta_value' => 'supplier' ) ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
			'client'    => array( __( 'Travellers', 'travel-agency-core' ), $count( array( 'role' => TAC_HOST_ROLE ) ) - $count( array( 'role' => TAC_HOST_ROLE, 'meta_key' => 'tac_account_type', 'meta_value' => 'supplier' ) ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
			'suspended' => array( __( 'Suspended', 'travel-agency-core' ), count( tac_suspended_user_ids() ) ),
		);
		foreach ( $items as $key => $item ) {
			$views[ 'tac_' . $key ] = sprintf(
				'<a href="%s"%s>%s <span class="count">(%d)</span></a>',
				esc_url( add_query_arg( 'tac_view', $key, $base ) ),
				$current === $key ? ' class="current" aria-current="page"' : '',
				esc_html( $item[0] ),
				(int) $item[1]
			);
		}
		return $views;
	}
);

add_action(
	'pre_get_users',
	function ( WP_User_Query $q ) {
		global $pagenow;
		if ( 'users.php' !== $pagenow || empty( $_GET['tac_view'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		switch ( sanitize_key( $_GET['tac_view'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			case 'supplier':
				$q->set( 'meta_query', array( array( 'key' => 'tac_account_type', 'value' => 'supplier' ) ) );
				break;
			case 'client':
				$q->set( 'role', TAC_HOST_ROLE );
				$q->set(
					'meta_query',
					array(
						'relation' => 'OR',
						array( 'key' => 'tac_account_type', 'compare' => 'NOT EXISTS' ),
						array( 'key' => 'tac_account_type', 'value' => 'supplier', 'compare' => '!=' ),
					)
				);
				break;
			case 'suspended':
				$q->set( 'meta_query', array( array( 'key' => 'tac_suspended', 'value' => '1' ) ) );
				break;
		}
	}
);

// Suspend / Unsuspend row actions (never on administrators).
add_filter(
	'user_row_actions',
	function ( $actions, WP_User $user ) {
		if ( ! current_user_can( 'edit_user', $user->ID ) || user_can( $user, 'manage_options' ) ) {
			return $actions;
		}
		$suspended = tac_is_suspended( $user->ID );
		$url       = wp_nonce_url(
			add_query_arg(
				array(
					'tac_suspend' => $suspended ? '0' : '1',
					'user'        => $user->ID,
				),
				admin_url( 'users.php' )
			),
			'tac_suspend_' . $user->ID
		);
		$actions['tac_suspend'] = '<a href="' . esc_url( $url ) . '"' . ( $suspended ? '' : ' style="color:#b32d2e"' ) . '>' . esc_html( $suspended ? __( 'Unsuspend', 'travel-agency-core' ) : __( 'Suspend', 'travel-agency-core' ) ) . '</a>';
		return $actions;
	},
	10,
	2
);

add_action(
	'admin_init',
	function () {
		if ( ! isset( $_GET['tac_suspend'], $_GET['user'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$user_id = absint( $_GET['user'] ); // phpcs:ignore WordPress.Security.NonceVerification
		check_admin_referer( 'tac_suspend_' . $user_id );
		if ( ! current_user_can( 'edit_user', $user_id ) || user_can( $user_id, 'manage_options' ) ) {
			wp_die( esc_html__( 'You cannot change this account.', 'travel-agency-core' ) );
		}
		$suspend = '1' === $_GET['tac_suspend']; // phpcs:ignore WordPress.Security.NonceVerification
		tac_set_suspended( $user_id, $suspend );
		wp_safe_redirect( add_query_arg( 'tac_suspended', $suspend ? 'on' : 'off', admin_url( 'users.php' ) ) );
		exit;
	}
);

add_action(
	'admin_notices',
	function () {
		if ( empty( $_GET['tac_suspended'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$on = 'on' === $_GET['tac_suspended']; // phpcs:ignore WordPress.Security.NonceVerification
		printf(
			'<div class="notice notice-success is-dismissible"><p>%s</p></div>',
			esc_html(
				$on
					? __( 'Account suspended: its listings are hidden and it is signed out.', 'travel-agency-core' )
					: __( 'Account restored: its published listings are visible again.', 'travel-agency-core' )
			)
		);
	}
);

// Account type, phone and suspension on the user's profile screen.
function tac_profile_fields( WP_User $user ) {
	$type = tac_account_type( $user->ID );
	?>
	<h2><?php esc_html_e( 'MoroccoTravely account', 'travel-agency-core' ); ?></h2>
	<table class="form-table" role="presentation">
		<tr>
			<th><label for="tac_account_type"><?php esc_html_e( 'Account type', 'travel-agency-core' ); ?></label></th>
			<td>
				<select name="tac_account_type" id="tac_account_type">
					<option value="client" <?php selected( $type, 'client' ); ?>><?php esc_html_e( 'Traveller (books trips)', 'travel-agency-core' ); ?></option>
					<option value="supplier" <?php selected( $type, 'supplier' ); ?>><?php esc_html_e( 'Business (publishes listings)', 'travel-agency-core' ); ?></option>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="tac_phone"><?php esc_html_e( 'Phone / WhatsApp', 'travel-agency-core' ); ?></label></th>
			<td><input type="text" class="regular-text" name="tac_phone" id="tac_phone" value="<?php echo esc_attr( get_user_meta( $user->ID, 'tac_phone', true ) ); ?>"></td>
		</tr>
		<?php if ( ! user_can( $user, 'manage_options' ) ) : ?>
		<tr>
			<th><?php esc_html_e( 'Suspended', 'travel-agency-core' ); ?></th>
			<td>
				<label><input type="checkbox" name="tac_suspended" value="1" <?php checked( tac_is_suspended( $user->ID ) ); ?>>
				<?php esc_html_e( 'Hide all their listings and block sign-in', 'travel-agency-core' ); ?></label>
			</td>
		</tr>
		<?php endif; ?>
	</table>
	<?php
}
add_action( 'show_user_profile', 'tac_profile_fields' );
add_action( 'edit_user_profile', 'tac_profile_fields' );

function tac_save_profile_fields( $user_id ) {
	if ( ! current_user_can( 'edit_user', $user_id ) ) {
		return;
	}
	check_admin_referer( 'update-user_' . $user_id );
	if ( isset( $_POST['tac_account_type'] ) ) {
		tac_set_account_type( $user_id, sanitize_key( $_POST['tac_account_type'] ) );
	}
	if ( isset( $_POST['tac_phone'] ) ) {
		update_user_meta( $user_id, 'tac_phone', sanitize_text_field( wp_unslash( $_POST['tac_phone'] ) ) );
	}
	if ( ! user_can( $user_id, 'manage_options' ) ) {
		$want = ! empty( $_POST['tac_suspended'] );
		if ( $want !== tac_is_suspended( $user_id ) ) {
			tac_set_suspended( $user_id, $want );
		}
	}
}
add_action( 'personal_options_update', 'tac_save_profile_fields' );
add_action( 'edit_user_profile_update', 'tac_save_profile_fields' );

/* ======================= Inquiries (bookings) ======================= */

add_filter(
	'manage_inquiry_posts_columns',
	function () {
		return array(
			'cb'           => '<input type="checkbox" />',
			'tac_status'   => __( 'Status', 'travel-agency-core' ),
			'title'        => __( 'Request', 'travel-agency-core' ),
			'tac_listing'  => __( 'Listing', 'travel-agency-core' ),
			'tac_business' => __( 'Business', 'travel-agency-core' ),
			'tac_client'   => __( 'Client', 'travel-agency-core' ),
			'tac_when'     => __( 'Date', 'travel-agency-core' ),
			'tac_guests'   => __( 'Guests', 'travel-agency-core' ),
			'date'         => __( 'Received', 'travel-agency-core' ),
		);
	}
);

add_action(
	'manage_inquiry_posts_custom_column',
	function ( $col, $post_id ) {
		switch ( $col ) {
			case 'tac_status':
				$s = (string) get_post_meta( $post_id, 'status', true ) ?: 'requested';
				echo tac_pill( $s, TAC_STATUS_LABELS[ $s ] ?? $s ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in tac_pill().
				break;
			case 'tac_listing':
				$l = get_post( (int) get_post_meta( $post_id, 'tour_id', true ) );
				if ( $l ) {
					echo '<a href="' . esc_url( get_edit_post_link( $l->ID ) ) . '">' . esc_html( $l->post_title ) . '</a>';
				}
				break;
			case 'tac_business':
				$owner_id = (int) get_post_meta( $post_id, 'owner_id', true );
				$owner    = $owner_id ? get_userdata( $owner_id ) : null;
				echo $owner
					? '<a href="' . esc_url( get_edit_user_link( $owner->ID ) ) . '">' . esc_html( $owner->display_name ) . '</a><br><span class="description">' . esc_html( $owner->user_email ) . '</span>'
					: '<span class="description">' . esc_html__( 'Your team', 'travel-agency-core' ) . '</span>';
				break;
			case 'tac_client':
				$email = (string) get_post_meta( $post_id, 'email', true );
				echo esc_html( (string) get_post_meta( $post_id, 'name', true ) ) . '<br><a href="mailto:' . esc_attr( $email ) . '">' . esc_html( $email ) . '</a>';
				$phone = (string) get_post_meta( $post_id, 'phone', true );
				if ( $phone ) {
					echo '<br><span class="description">' . esc_html( $phone ) . '</span>';
				}
				break;
			case 'tac_when':
				echo esc_html( (string) get_post_meta( $post_id, 'date', true ) );
				break;
			case 'tac_guests':
				echo (int) get_post_meta( $post_id, 'guests', true );
				break;
		}
	},
	10,
	2
);

// Status filter above the bookings table.
add_action(
	'restrict_manage_posts',
	function ( $post_type ) {
		if ( 'inquiry' !== $post_type ) {
			return;
		}
		$current = isset( $_GET['tac_status'] ) ? sanitize_key( $_GET['tac_status'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		echo '<select name="tac_status"><option value="">' . esc_html__( 'All statuses', 'travel-agency-core' ) . '</option>';
		foreach ( TAC_STATUS_LABELS as $key => $label ) {
			echo '<option value="' . esc_attr( $key ) . '"' . selected( $current, $key, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
	}
);

add_action(
	'pre_get_posts',
	function ( WP_Query $q ) {
		global $pagenow;
		if ( 'edit.php' !== $pagenow || ! $q->is_main_query() || 'inquiry' !== $q->get( 'post_type' ) || empty( $_GET['tac_status'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$status = sanitize_key( $_GET['tac_status'] ); // phpcs:ignore WordPress.Security.NonceVerification
		if ( 'requested' === $status ) {
			// Older requests may have no status stored yet.
			$q->set(
				'meta_query',
				array(
					'relation' => 'OR',
					array( 'key' => 'status', 'value' => 'requested' ),
					array( 'key' => 'status', 'compare' => 'NOT EXISTS' ),
				)
			);
		} elseif ( isset( TAC_STATUS_LABELS[ $status ] ) ) {
			$q->set( 'meta_query', array( array( 'key' => 'status', 'value' => $status ) ) );
		}
	}
);

// Change a booking's status from its edit screen.
add_action(
	'add_meta_boxes_inquiry',
	function () {
		add_meta_box(
			'tac_inquiry_status',
			__( 'Booking status', 'travel-agency-core' ),
			function ( WP_Post $post ) {
				$s = (string) get_post_meta( $post->ID, 'status', true ) ?: 'requested';
				wp_nonce_field( 'tac_inquiry_status', 'tac_inquiry_status_nonce' );
				echo '<select name="tac_inquiry_status" style="width:100%">';
				foreach ( TAC_STATUS_LABELS as $key => $label ) {
					echo '<option value="' . esc_attr( $key ) . '"' . selected( $s, $key, false ) . '>' . esc_html( $label ) . '</option>';
				}
				echo '</select><p class="description">' . esc_html__( 'Changing it here does not email anyone.', 'travel-agency-core' ) . '</p>';
				$reply = (string) get_post_meta( $post->ID, 'reply', true );
				if ( $reply ) {
					echo '<p><strong>' . esc_html__( 'Business reply:', 'travel-agency-core' ) . '</strong> ' . esc_html( $reply ) . '</p>';
				}
			},
			'inquiry',
			'side',
			'high'
		);
	}
);

add_action(
	'save_post_inquiry',
	function ( $post_id ) {
		if ( ! isset( $_POST['tac_inquiry_status_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['tac_inquiry_status_nonce'] ), 'tac_inquiry_status' ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) || empty( $_POST['tac_inquiry_status'] ) ) {
			return;
		}
		$s = sanitize_key( $_POST['tac_inquiry_status'] );
		if ( isset( TAC_STATUS_LABELS[ $s ] ) ) {
			update_post_meta( $post_id, 'status', $s );
		}
	}
);

/* ======================= Listings ======================= */

add_filter(
	'manage_tour_posts_columns',
	function ( $cols ) {
		$new = array();
		foreach ( $cols as $key => $label ) {
			$new[ $key ] = $label;
			if ( 'title' === $key ) {
				$new['tac_business'] = __( 'Business', 'travel-agency-core' );
				$new['tac_price']    = __( 'Price', 'travel-agency-core' );
			}
		}
		unset( $new['author'] );
		return $new;
	}
);

add_action(
	'manage_tour_posts_custom_column',
	function ( $col, $post_id ) {
		if ( 'tac_business' === $col ) {
			$post  = get_post( $post_id );
			$owner = tac_listing_owner_id( $post );
			if ( ! $owner ) {
				echo '<span class="description">' . esc_html__( 'Your team', 'travel-agency-core' ) . '</span>';
				return;
			}
			$user = get_userdata( $owner );
			echo '<a href="' . esc_url( admin_url( 'edit.php?post_type=tour&author=' . $owner ) ) . '" title="' . esc_attr__( 'Show only this business', 'travel-agency-core' ) . '">' . esc_html( $user->display_name ) . '</a>';
			if ( tac_is_suspended( $owner ) ) {
				echo ' ' . tac_pill( 'suspended', __( 'Suspended', 'travel-agency-core' ) ); // phpcs:ignore WordPress.Security.EscapeOutput
			}
		} elseif ( 'tac_price' === $col ) {
			$price = (float) get_post_meta( $post_id, 'price', true );
			$units = tac_price_units();
			$unit  = get_post_meta( $post_id, 'price_unit', true ) ?: 'per_adult';
			echo esc_html( $price ? number_format_i18n( $price ) . ' ' . ( get_post_meta( $post_id, 'currency', true ) ?: 'EUR' ) . ' ' . ( $units[ $unit ] ?? '' ) : '—' );
		}
	},
	10,
	2
);

// "Businesses" dropdown above the listings table.
add_action(
	'restrict_manage_posts',
	function ( $post_type ) {
		if ( 'tour' !== $post_type ) {
			return;
		}
		$owners = get_users(
			array(
				'meta_key'   => 'tac_account_type', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value' => 'supplier', // phpcs:ignore WordPress.DB.SlowDBQuery
				'orderby'    => 'display_name',
			)
		);
		if ( ! $owners ) {
			return;
		}
		$current = isset( $_GET['author'] ) ? absint( $_GET['author'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification
		echo '<select name="author"><option value="">' . esc_html__( 'All businesses', 'travel-agency-core' ) . '</option>';
		foreach ( $owners as $o ) {
			echo '<option value="' . esc_attr( $o->ID ) . '"' . selected( $current, $o->ID, false ) . '>' . esc_html( $o->display_name ) . '</option>';
		}
		echo '</select>';
	}
);
