<?php
/**
 * wp-admin → Marketplace → Site pages: the platform's own pages (About Us, FAQs, policies)
 * in one place, with Edit and View buttons. A missing page is created from the starter text
 * in data/sample-content.json, published, and opened in the editor.
 */

if ( ! defined( 'ABSPATH' ) || ! is_admin() ) {
	return;
}

/** slug => [title, what it is for]. */
function tac_site_pages() {
	return array(
		'about-us'                    => array( __( 'About Us', 'travel-agency-core' ), __( 'Who you are and how the marketplace works.', 'travel-agency-core' ) ),
		'faqs'                        => array( __( 'FAQs', 'travel-agency-core' ), __( 'Questions about the platform: booking, payment, accounts. Each "Heading 2" starts a group, each "Heading 3" is a question, and the text under it is the answer. Questions about one experience are answered by its business on the listing page.', 'travel-agency-core' ) ),
		'booking-cancellation-policy' => array( __( 'Booking & Cancellation Policy', 'travel-agency-core' ), __( 'How booking requests, offers and cancellations work on the platform.', 'travel-agency-core' ) ),
		'privacy-policy'              => array( __( 'Privacy Policy', 'travel-agency-core' ), __( 'What personal data you collect and why.', 'travel-agency-core' ) ),
		'terms-and-conditions'        => array( __( 'Terms & Conditions', 'travel-agency-core' ), __( 'Short overview that links to the traveller and supplier terms.', 'travel-agency-core' ) ),
		'traveller-terms'             => array( __( 'Traveller Terms & Conditions', 'travel-agency-core' ), __( 'Rules for travellers: accounts, booking requests, prices, cancellations, reviews. Linked in sign-up, the booking form, the review form and the footer. Have it checked by a legal adviser.', 'travel-agency-core' ) ),
		'supplier-terms'              => array( __( 'Supplier Terms & Conditions', 'travel-agency-core' ), __( 'Rules for businesses: account, licences and insurance, listings, answering requests, reviews. Accepted at business sign-up; linked in the footer and the business profile. Have it checked by a legal adviser.', 'travel-agency-core' ) ),
	);
}

add_action(
	'admin_menu',
	function () {
		add_submenu_page( 'tac-marketplace', __( 'Site pages', 'travel-agency-core' ), __( 'Site pages', 'travel-agency-core' ), 'edit_pages', 'tac-site-pages', 'tac_render_site_pages' );
	},
	21
);

add_action(
	'admin_post_tac_create_site_page',
	function () {
		if ( ! current_user_can( 'publish_pages' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do this.', 'travel-agency-core' ), 403 );
		}
		check_admin_referer( 'tac_create_site_page' );
		$slug  = sanitize_title( wp_unslash( $_POST['slug'] ?? '' ) );
		$pages = tac_site_pages();
		if ( ! isset( $pages[ $slug ] ) ) {
			wp_die( esc_html__( 'Unknown page.', 'travel-agency-core' ), 400 );
		}
		$existing = get_page_by_path( $slug, OBJECT, 'page' );
		$content  = '';
		$data     = json_decode( (string) file_get_contents( TAC_DIR . 'data/sample-content.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		foreach ( $data['pages'] ?? array() as $p ) {
			if ( $p['slug'] === $slug ) {
				$content = $p['content'];
			}
		}
		$id = wp_insert_post(
			array(
				'ID'           => $existing ? $existing->ID : 0,
				'post_type'    => 'page',
				'post_name'    => $slug,
				'post_title'   => $existing ? $existing->post_title : $pages[ $slug ][0],
				'post_content' => $existing && '' !== trim( $existing->post_content ) ? $existing->post_content : $content,
				'post_status'  => 'publish',
			),
			true
		);
		wp_safe_redirect( is_wp_error( $id ) ? admin_url( 'admin.php?page=tac-site-pages' ) : admin_url( 'post.php?action=edit&post=' . $id ) );
		exit;
	}
);

function tac_render_site_pages() {
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Site pages', 'travel-agency-core' ); ?></h1>
		<p><?php esc_html_e( 'The platform\'s own pages, linked in the footer and the menus. Click Edit to change the text: changes show on the site as soon as you click Update.', 'travel-agency-core' ); ?></p>
		<table class="widefat striped" style="max-width:1100px">
			<thead><tr>
				<th><?php esc_html_e( 'Page', 'travel-agency-core' ); ?></th>
				<th><?php esc_html_e( 'What it is for', 'travel-agency-core' ); ?></th>
				<th><?php esc_html_e( 'Status', 'travel-agency-core' ); ?></th>
				<th><?php esc_html_e( 'Last changed', 'travel-agency-core' ); ?></th>
				<th style="width:190px"><?php esc_html_e( 'Actions', 'travel-agency-core' ); ?></th>
			</tr></thead>
			<tbody>
			<?php foreach ( tac_site_pages() as $slug => [ $title, $about ] ) : ?>
				<?php
				$page = get_page_by_path( $slug, OBJECT, 'page' );
				$live = $page && 'publish' === $page->post_status;
				?>
				<tr>
					<td><strong><?php echo esc_html( $page ? $page->post_title : $title ); ?></strong><br><code>/<?php echo esc_html( $slug ); ?></code></td>
					<td><?php echo esc_html( $about ); ?></td>
					<td><?php echo $live ? tac_pill( 'ok', __( 'Published', 'travel-agency-core' ) ) : tac_pill( 'wait', $page ? __( 'Not published', 'travel-agency-core' ) : __( 'Missing', 'travel-agency-core' ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?></td>
					<td><?php echo $page ? esc_html( mysql2date( get_option( 'date_format' ), $page->post_modified ) ) : '—'; ?></td>
					<td>
						<?php if ( $live ) : ?>
							<a class="button button-primary" href="<?php echo esc_url( admin_url( 'post.php?action=edit&post=' . $page->ID ) ); ?>"><?php esc_html_e( 'Edit', 'travel-agency-core' ); ?></a>
							<a class="button" href="<?php echo esc_url( tac_frontend_url( '/' . $slug ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'View', 'travel-agency-core' ); ?></a>
						<?php else : ?>
							<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
								<?php wp_nonce_field( 'tac_create_site_page' ); ?>
								<input type="hidden" name="action" value="tac_create_site_page">
								<input type="hidden" name="slug" value="<?php echo esc_attr( $slug ); ?>">
								<button type="submit" class="button button-primary"><?php echo esc_html( $page ? __( 'Publish and edit', 'travel-agency-core' ) : __( 'Create and edit', 'travel-agency-core' ) ); ?></button>
							</form>
						<?php endif; ?>
					</td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<p class="description" style="margin-top:12px"><?php esc_html_e( 'Contact Us is built into the site: its details come from Agency details.', 'travel-agency-core' ); ?></p>
	</div>
	<?php
}
