<?php
/**
 * Agency details: contact information and social media links, edited in
 * wp-admin → Agency details and shown in the site footer and on Contact Us.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_SETTINGS_OPTION = 'tac_agency_settings';

/**
 * Networks with an icon in the app. "other" shows a globe and the label you type.
 */
function tac_social_networks() {
	return array(
		'facebook'     => 'Facebook',
		'instagram'    => 'Instagram',
		'tiktok'       => 'TikTok',
		'youtube'      => 'YouTube',
		'x'            => 'X (Twitter)',
		'tripadvisor'  => 'Tripadvisor',
		'google'       => 'Google reviews',
		'getyourguide' => 'GetYourGuide',
		'viator'       => 'Viator',
		'pinterest'    => 'Pinterest',
		'linkedin'     => 'LinkedIn',
		'threads'      => 'Threads',
		'other'        => __( 'Other (type a name)', 'travel-agency-core' ),
	);
}

function tac_settings() {
	$saved = get_option( TAC_SETTINGS_OPTION, array() );
	return wp_parse_args(
		is_array( $saved ) ? $saved : array(),
		array(
			'email'    => '',
			'phone'    => '',
			'whatsapp' => '',
			'address'  => '',
			'about'    => '',
			'payments' => '',
			'social'   => array(),
		)
	);
}

/**
 * Clean submitted settings. Social rows without a valid URL are dropped.
 */
function tac_sanitize_settings( $raw ) {
	$raw      = is_array( $raw ) ? $raw : array();
	$networks = tac_social_networks();
	$social   = array();
	foreach ( (array) ( $raw['social'] ?? array() ) as $row ) {
		$network = sanitize_key( $row['network'] ?? '' );
		$url     = esc_url_raw( trim( (string) ( $row['url'] ?? '' ) ), array( 'http', 'https' ) );
		if ( ! $url || ! isset( $networks[ $network ] ) ) {
			continue;
		}
		$label    = sanitize_text_field( $row['label'] ?? '' );
		$social[] = array(
			'network' => $network,
			'label'   => $label ? $label : ( 'other' === $network ? __( 'Website', 'travel-agency-core' ) : $networks[ $network ] ),
			'url'     => $url,
		);
	}
	return array(
		'email'    => sanitize_email( $raw['email'] ?? '' ),
		'phone'    => sanitize_text_field( $raw['phone'] ?? '' ),
		// wa.me needs the international number as digits only.
		'whatsapp' => preg_replace( '/\D/', '', (string) ( $raw['whatsapp'] ?? '' ) ),
		'address'  => sanitize_textarea_field( $raw['address'] ?? '' ),
		'about'    => sanitize_textarea_field( $raw['about'] ?? '' ),
		'payments' => sanitize_text_field( $raw['payments'] ?? '' ),
		'social'   => $social,
	);
}

/* ---------- wp-admin page ---------- */

add_action( 'admin_init', 'tac_register_settings' );

function tac_register_settings() {
	register_setting(
		'tac_agency',
		TAC_SETTINGS_OPTION,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'tac_sanitize_settings',
		)
	);
}

add_action( 'admin_menu', 'tac_add_settings_page' );

function tac_add_settings_page() {
	add_menu_page(
		__( 'Agency details', 'travel-agency-core' ),
		__( 'Agency details', 'travel-agency-core' ),
		'manage_options',
		'tac-agency',
		'tac_render_settings_page',
		'dashicons-share',
		26
	);
}

function tac_render_settings_page() {
	$s        = tac_settings();
	$name     = TAC_SETTINGS_OPTION;
	$networks = tac_social_networks();
	// Saved links plus three empty rows to add more.
	$rows = array_merge( $s['social'], array_fill( 0, 3, array( 'network' => '', 'label' => '', 'url' => '' ) ) );
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Agency details', 'travel-agency-core' ); ?></h1>
		<?php settings_errors(); // Top-level pages don't show "Settings saved." on their own. ?>
		<p><?php esc_html_e( 'Shown on the Contact Us page and in the website footer. Leave a field empty to hide it.', 'travel-agency-core' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( 'tac_agency' ); ?>
			<h2><?php esc_html_e( 'Contact', 'travel-agency-core' ); ?></h2>
			<table class="form-table">
				<tr>
					<th><label for="tac-email"><?php esc_html_e( 'Email', 'travel-agency-core' ); ?></label></th>
					<td><input class="regular-text" type="email" id="tac-email" name="<?php echo esc_attr( $name ); ?>[email]" value="<?php echo esc_attr( $s['email'] ); ?>"></td>
				</tr>
				<tr>
					<th><label for="tac-phone"><?php esc_html_e( 'Phone', 'travel-agency-core' ); ?></label></th>
					<td><input class="regular-text" id="tac-phone" name="<?php echo esc_attr( $name ); ?>[phone]" value="<?php echo esc_attr( $s['phone'] ); ?>" placeholder="+212 6 00 00 00 00"></td>
				</tr>
				<tr>
					<th><label for="tac-whatsapp"><?php esc_html_e( 'WhatsApp number', 'travel-agency-core' ); ?></label></th>
					<td>
						<input class="regular-text" id="tac-whatsapp" name="<?php echo esc_attr( $name ); ?>[whatsapp]" value="<?php echo esc_attr( $s['whatsapp'] ); ?>" placeholder="212600000000">
						<p class="description"><?php esc_html_e( 'International format with the country code, e.g. 212600000000.', 'travel-agency-core' ); ?></p>
					</td>
				</tr>
				<tr>
					<th><label for="tac-address"><?php esc_html_e( 'Address', 'travel-agency-core' ); ?></label></th>
					<td><textarea class="large-text" rows="2" id="tac-address" name="<?php echo esc_attr( $name ); ?>[address]"><?php echo esc_textarea( $s['address'] ); ?></textarea></td>
				</tr>
				<tr>
					<th><label for="tac-about"><?php esc_html_e( 'About us (footer)', 'travel-agency-core' ); ?></label></th>
					<td>
						<textarea class="large-text" rows="4" id="tac-about" name="<?php echo esc_attr( $name ); ?>[about]"><?php echo esc_textarea( $s['about'] ); ?></textarea>
						<p class="description"><?php esc_html_e( 'A few sentences about your agency, shown in the footer.', 'travel-agency-core' ); ?></p>
					</td>
				</tr>
				<tr>
					<th><label for="tac-payments"><?php esc_html_e( 'Accepted payment', 'travel-agency-core' ); ?></label></th>
					<td>
						<input class="regular-text" id="tac-payments" name="<?php echo esc_attr( $name ); ?>[payments]" value="<?php echo esc_attr( $s['payments'] ); ?>" placeholder="PayPal, Bank transfer, Wise, Cash">
						<p class="description"><?php esc_html_e( 'Comma separated, shown in the footer.', 'travel-agency-core' ); ?></p>
					</td>
				</tr>
			</table>

			<h2><?php esc_html_e( 'Social media and review sites', 'travel-agency-core' ); ?></h2>
			<p><?php esc_html_e( 'Pick a site and paste the full link to your page. To remove a link, empty its URL. Save to get more empty rows.', 'travel-agency-core' ); ?></p>
			<table class="widefat striped" style="max-width:900px">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Site', 'travel-agency-core' ); ?></th>
						<th><?php esc_html_e( 'Name (only for "Other")', 'travel-agency-core' ); ?></th>
						<th><?php esc_html_e( 'Link (https://…)', 'travel-agency-core' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( $rows as $i => $row ) : ?>
						<tr>
							<td>
								<select name="<?php echo esc_attr( "{$name}[social][$i][network]" ); ?>" aria-label="<?php esc_attr_e( 'Site', 'travel-agency-core' ); ?>">
									<?php foreach ( $networks as $key => $label ) : ?>
										<option value="<?php echo esc_attr( $key ); ?>" <?php selected( $row['network'] ? $row['network'] : 'facebook', $key ); ?>><?php echo esc_html( $label ); ?></option>
									<?php endforeach; ?>
								</select>
							</td>
							<td><input class="regular-text" name="<?php echo esc_attr( "{$name}[social][$i][label]" ); ?>" value="<?php echo esc_attr( 'other' === $row['network'] ? $row['label'] : '' ); ?>" aria-label="<?php esc_attr_e( 'Name', 'travel-agency-core' ); ?>"></td>
							<td><input class="large-text" type="url" name="<?php echo esc_attr( "{$name}[social][$i][url]" ); ?>" value="<?php echo esc_attr( $row['url'] ); ?>" placeholder="https://" aria-label="<?php esc_attr_e( 'Link', 'travel-agency-core' ); ?>"></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

/* ---------- REST ---------- */

add_action( 'rest_api_init', 'tac_register_settings_route' );

function tac_register_settings_route() {
	register_rest_route(
		'travel/v1',
		'/settings',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => function () {
				$s = tac_settings();
				return array(
					'contact'  => array(
						'email'    => $s['email'],
						'phone'    => $s['phone'],
						'whatsapp' => $s['whatsapp'],
						'address'  => $s['address'],
					),
					'about'    => $s['about'],
					'payments' => array_values( array_filter( array_map( 'trim', explode( ',', $s['payments'] ) ) ) ),
					'social'   => array_values( $s['social'] ),
				);
			},
			'permission_callback' => '__return_true',
		)
	);
}
