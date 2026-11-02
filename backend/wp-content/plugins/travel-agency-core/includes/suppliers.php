<?php
/**
 * Supplier accounts: registration and login (email + password, or Google), business
 * profile, onboarding checklist, verification documents and the public supplier profile.
 *
 * Suppliers are WordPress users with the "Supplier" role. The app sends the session token
 * (auth.php) as `Authorization: Bearer <token>` on /supplier/* routes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_SUPPLIER_ROLE = 'travel_supplier';

add_action(
	'init',
	function () {
		if ( ! get_role( TAC_SUPPLIER_ROLE ) ) {
			add_role( TAC_SUPPLIER_ROLE, __( 'Supplier', 'travel-agency-core' ), array( 'read' => true ) );
		}
	}
);

/**
 * Business profile fields: key => [label, type, public].
 * Public fields appear on listings and the supplier's public page.
 */
function tac_supplier_fields() {
	return array(
		'business_name'       => array( __( 'Business or supplier name', 'travel-agency-core' ), 'text', true ),
		'business_type'       => array( __( 'Business type', 'travel-agency-core' ), 'select', true ),
		'bio'                 => array( __( 'About your business (public)', 'travel-agency-core' ), 'textarea', true ),
		'legal_name'          => array( __( 'Legal business name', 'travel-agency-core' ), 'text', false ),
		'registration_number' => array( __( 'Registration number (RC / ICE / licence number)', 'travel-agency-core' ), 'text', false ),
		'contact_name'        => array( __( 'Contact person', 'travel-agency-core' ), 'text', false ),
		'phone'               => array( __( 'Phone', 'travel-agency-core' ), 'text', false ),
		'whatsapp'            => array( __( 'WhatsApp', 'travel-agency-core' ), 'text', false ),
		'website'             => array( __( 'Website', 'travel-agency-core' ), 'text', true ),
		'address'             => array( __( 'Business address', 'travel-agency-core' ), 'textarea', false ),
		'operating_locations' => array( __( 'Operating locations (one per line)', 'travel-agency-core' ), 'list', true ),
		'languages'           => array( __( 'Languages', 'travel-agency-core' ), 'text', true ),
		'service_coverage'    => array( __( 'Service coverage', 'travel-agency-core' ), 'text', true ),
		'team'                => array( __( 'Team (guides, drivers, instructors)', 'travel-agency-core' ), 'textarea', false ),
		'permits'             => array( __( 'Permits, licences and insurance', 'travel-agency-core' ), 'textarea', false ),
		'payout'              => array( __( 'Payout details (for when online payment is enabled)', 'travel-agency-core' ), 'textarea', false ),
		'notify_email'        => array( __( 'Email me about new booking requests', 'travel-agency-core' ), 'boolean', false ),
		'notify_language'     => array( __( 'Preferred language for emails', 'travel-agency-core' ), 'text', false ),
	);
}

function tac_business_types() {
	return array(
		'tour_operator'     => __( 'Tour operator', 'travel-agency-core' ),
		'travel_agency'     => __( 'Travel agency', 'travel-agency-core' ),
		'guide'             => __( 'Licensed guide', 'travel-agency-core' ),
		'activity_provider' => __( 'Activity provider', 'travel-agency-core' ),
		'artisan'           => __( 'Artisan or workshop host', 'travel-agency-core' ),
		'transport'         => __( 'Transport provider', 'travel-agency-core' ),
		'other'             => __( 'Other', 'travel-agency-core' ),
	);
}

function tac_is_supplier( $user ) {
	$user = $user instanceof WP_User ? $user : get_userdata( (int) $user );
	return $user && ( in_array( TAC_SUPPLIER_ROLE, (array) $user->roles, true ) || user_can( $user, 'edit_others_posts' ) );
}

/**
 * permission_callback for /supplier/* routes: a signed-in supplier (or site admin) that isn't suspended.
 */
function tac_require_supplier( WP_REST_Request $req ) {
	$user = tac_user_from_request( $req );
	if ( ! $user ) {
		return new WP_Error( 'unauthorized', __( 'Please sign in again.', 'travel-agency-core' ), array( 'status' => 401 ) );
	}
	if ( tac_is_suspended( $user->ID ) ) {
		return new WP_Error( 'suspended', __( 'Your account is suspended. Please contact us.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}
	if ( ! tac_is_supplier( $user ) ) {
		return new WP_Error( 'not_supplier', __( 'This account is not a supplier account.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}
	// The platform team doesn't list experiences: in marketplace mode the supplier dashboard is for businesses only.
	if ( tac_marketplace_only() && ! in_array( TAC_SUPPLIER_ROLE, (array) $user->roles, true ) ) {
		return new WP_Error( 'not_supplier', __( 'This is a platform team account. Manage businesses and listings in wp-admin → Marketplace.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}
	$req->set_param( '_tac_user', $user->ID );
	return true;
}

/* ---------- Profile ---------- */

function tac_supplier_meta( $user_id, $key ) {
	return get_user_meta( $user_id, 'sp_' . $key, true );
}

/**
 * Private: everything the supplier sees in the dashboard.
 */
function tac_format_supplier( WP_User $user ) {
	$profile = array();
	foreach ( tac_supplier_fields() as $key => $def ) {
		$value           = tac_supplier_meta( $user->ID, $key );
		$profile[ $key ] = 'boolean' === $def[1] ? '' === $value || (bool) $value : (string) $value;
	}
	$docs = array();
	foreach ( tac_supplier_document_ids( $user->ID ) as $id ) {
		$docs[] = array( 'id' => $id, 'name' => get_the_title( $id ), 'url' => wp_get_attachment_url( $id ) );
	}
	return array(
		'id'           => $user->ID,
		'name'         => $user->display_name,
		'email'        => $user->user_email,
		'slug'         => $user->user_nicename,
		'isAdmin'      => user_can( $user, 'edit_others_posts' ),
		'profile'      => $profile,
		'logo'         => ( $logo = (int) tac_supplier_meta( $user->ID, 'logo_id' ) ) ? wp_get_attachment_image_url( $logo, 'medium' ) : null,
		'documents'    => $docs,
		'termsAccepted'=> (string) tac_supplier_meta( $user->ID, 'terms_accepted' ),
		'verification' => array(
			'status' => tac_supplier_status( $user->ID ),
			'note'   => (string) tac_supplier_meta( $user->ID, 'verification_note' ),
		),
		'checklist'    => tac_supplier_checklist( $user->ID ),
		// Requests waiting for an answer: the green badge in the header and dashboard.
		// Unread messages from the platform team (dashboard → Messages).
		'unreadMessages' => function_exists( 'tac_unread_messages' ) ? count( tac_unread_messages( 'business', $user->ID ) ) : 0,
		'newBookings'  => count(
			tac_inquiries(
				array(
					array( 'key' => 'supplier_id', 'value' => $user->ID, 'type' => 'NUMERIC' ),
					array( 'key' => 'status', 'value' => 'requested' ),
				)
			)
		),
	);
}

/**
 * unverified → pending (submitted) → verified | rejected.
 */
function tac_supplier_status( $user_id ) {
	$status = (string) tac_supplier_meta( $user_id, 'verification' );
	return in_array( $status, array( 'pending', 'verified', 'rejected' ), true ) ? $status : 'unverified';
}

/**
 * The onboarding checklist from the schema, with done/not done.
 */
function tac_supplier_checklist( $user_id ) {
	$m    = fn( $k ) => trim( (string) tac_supplier_meta( $user_id, $k ) );
	$user = get_userdata( $user_id );
	$done = array(
		'business_name' => '' !== $m( 'business_name' ),
		'website'       => '' !== $m( 'website' ),
		'logo'          => (bool) wp_get_attachment_image_url( (int) $m( 'logo_id' ), 'thumbnail' ),
		'legal'         => ( '' !== $m( 'legal_name' ) && '' !== $m( 'registration_number' ) ) || (bool) tac_supplier_document_ids( $user_id ),
		'contact'       => '' !== $m( 'contact_name' ) && '' !== $m( 'phone' ) && $user && $user->user_email,
		'address'       => '' !== $m( 'address' ) && '' !== $m( 'operating_locations' ),
		'business_type' => '' !== $m( 'business_type' ),
		'permits'       => '' !== $m( 'permits' ) || (bool) tac_supplier_document_ids( $user_id ),
		'languages'     => '' !== $m( 'languages' ) && '' !== $m( 'service_coverage' ),
		'payout'        => '' !== $m( 'payout' ),
		'terms'         => '' !== $m( 'terms_accepted' ),
	);
	return array_map(
		fn( $item ) => array(
			'key'      => $item['key'],
			'label'    => $item['label'],
			'done'     => (bool) ( $done[ $item['key'] ] ?? false ),
			// Optional: payout (only once online payment is on), the RC / legal details and the
			// documents. The website is required.
			'optional' => in_array( $item['key'], TAC_OPTIONAL_ONBOARDING, true ),
		),
		tac_listing_schema()['onboarding'] ?? array()
	);
}

/** Onboarding items a supplier may skip (verification and listing still possible). */
const TAC_OPTIONAL_ONBOARDING = array( 'legal', 'permits', 'payout' );

/**
 * A supplier website as a clean http(s) URL, or '' when it is not a valid address.
 * "atlas-trekking.ma" becomes "https://atlas-trekking.ma".
 */
function tac_clean_website( $url ) {
	$url = trim( (string) $url );
	if ( '' === $url ) {
		return '';
	}
	if ( ! preg_match( '#^https?://#i', $url ) ) {
		$url = 'https://' . $url;
	}
	$host = wp_parse_url( $url, PHP_URL_HOST );
	return $host && false !== strpos( $host, '.' ) && filter_var( $url, FILTER_VALIDATE_URL ) ? esc_url_raw( $url, array( 'http', 'https' ) ) : '';
}

function tac_website_error() {
	return new WP_Error( 'website', __( 'Please enter your website address, for example https://your-business.ma', 'travel-agency-core' ), array( 'status' => 400 ) );
}

/** "Erg Chebbi Camps" / "ergchebbi-camps" → "ergchebbicamps": compare names ignoring case, accents, spaces and punctuation. */
function tac_name_key( $name ) {
	return preg_replace( '/[^a-z0-9]/', '', strtolower( remove_accents( (string) $name ) ) );
}

/** The name part of a website: "https://www.ergchebbi-camps.ma/fr" → "ergchebbi-camps". */
function tac_website_name( $url ) {
	$host = strtolower( (string) wp_parse_url( tac_clean_website( $url ), PHP_URL_HOST ) );
	$host = preg_replace( '/^www\d*\./', '', $host );
	return (string) strtok( $host, '.' );
}

/** "ergchebbi-camps" → "Ergchebbi Camps": the business name a website suggests. */
function tac_name_from_website( $url ) {
	return ucwords( str_replace( array( '-', '_' ), ' ', tac_website_name( $url ) ) );
}

/**
 * Business name rules for suppliers: it must be the same as the website's name
 * (ergchebbi-camps.ma → "Ergchebbi Camps" or "ErgChebbi-Camps"), and no other supplier
 * may use the same name or website. Returns a WP_Error, or null when fine.
 */
function tac_business_name_error( $name, $website, $user_id = 0 ) {
	$key  = tac_name_key( $name );
	$site = tac_website_name( $website );
	if ( '' === $key ) {
		return new WP_Error( 'business_name', __( 'Please enter your business name.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	if ( '' === $site ) {
		return tac_website_error();
	}
	if ( tac_name_key( $site ) !== $key ) {
		return new WP_Error(
			'business_name',
			/* translators: 1: website, 2: suggested business name */
			sprintf( __( 'Your business name must be the same as your website name. For %1$s, use “%2$s”.', 'travel-agency-core' ), wp_parse_url( tac_clean_website( $website ), PHP_URL_HOST ), tac_name_from_website( $website ) ),
			array( 'status' => 400 )
		);
	}
	$others = get_users(
		array(
			'role'    => TAC_SUPPLIER_ROLE,
			'exclude' => $user_id ? array( (int) $user_id ) : array(),
			'fields'  => 'ID',
			'number'  => -1,
		)
	);
	foreach ( $others as $other ) {
		if ( tac_name_key( tac_supplier_meta( $other, 'business_name' ) ) === $key || tac_website_name( tac_supplier_meta( $other, 'website' ) ) === $site ) {
			return new WP_Error( 'business_name_taken', __( 'A supplier with this business name or website is already on the platform. If it is your business, sign in to that account or contact us.', 'travel-agency-core' ), array( 'status' => 409 ) );
		}
	}
	return null;
}

/** The supplier's page address on the platform (/provider/<slug>), made from the business name. */
function tac_supplier_slug( $name, $user_id = 0 ) {
	$base = substr( sanitize_title( $name ), 0, 45 ) ?: 'supplier';
	$slug = $base;
	for ( $i = 2; ( $other = get_user_by( 'slug', $slug ) ) && (int) $other->ID !== (int) $user_id; $i++ ) {
		$slug = $base . '-' . $i;
	}
	return $slug;
}

function tac_supplier_document_ids( $user_id ) {
	return array_values( array_filter( array_map( 'absint', explode( ',', (string) tac_supplier_meta( $user_id, 'documents' ) ) ) ) );
}

/**
 * Public: shown on listings and the supplier page.
 */
function tac_public_supplier( $user ) {
	$user = $user instanceof WP_User ? $user : get_userdata( (int) $user );
	// No author (e.g. imported demo listings) or an admin without a business name: the site's own listing.
	if ( ! $user || ( user_can( $user, 'edit_others_posts' ) && ! tac_supplier_meta( $user->ID, 'business_name' ) ) ) {
		// The site's own listings: shown as the agency (Agency details).
		$s = tac_settings();
		return array(
			'slug'     => '',
			'name'     => tac_site_name(),
			'bio'      => $s['about'],
			'logo'     => $s['logo'] ? $s['logo'] : null,
			'verified' => true,
			'type'     => '',
			'since'    => '',
		);
	}
	$logo  = (int) tac_supplier_meta( $user->ID, 'logo_id' );
	$types = tac_business_types();
	return array(
		'slug'      => $user->user_nicename,
		'name'      => tac_supplier_meta( $user->ID, 'business_name' ) ? (string) tac_supplier_meta( $user->ID, 'business_name' ) : $user->display_name,
		'bio'       => (string) tac_supplier_meta( $user->ID, 'bio' ),
		'logo'      => $logo ? wp_get_attachment_image_url( $logo, 'medium' ) : null,
		'verified'  => 'verified' === tac_supplier_status( $user->ID ),
		'type'      => $types[ (string) tac_supplier_meta( $user->ID, 'business_type' ) ] ?? '',
		'since'     => mysql2date( 'Y', $user->user_registered ),
		'languages' => (string) tac_supplier_meta( $user->ID, 'languages' ),
		'locations' => tac_lines( tac_supplier_meta( $user->ID, 'operating_locations' ) ),
		'website'   => esc_url_raw( (string) tac_supplier_meta( $user->ID, 'website' ) ),
	);
}

function tac_save_supplier_profile( $user_id, array $input ) {
	foreach ( tac_supplier_fields() as $key => $def ) {
		if ( ! array_key_exists( $key, $input ) ) {
			continue;
		}
		$v = $input[ $key ];
		switch ( $def[1] ) {
			case 'boolean':
				$v = $v ? '1' : '0';
				break;
			case 'textarea':
			case 'list':
				$v = sanitize_textarea_field( (string) $v );
				break;
			case 'select':
				$v = array_key_exists( (string) $v, tac_business_types() ) ? (string) $v : '';
				break;
			default:
				$v = 'website' === $key ? tac_clean_website( $v ) : sanitize_text_field( (string) $v );
		}
		update_user_meta( $user_id, 'sp_' . $key, $v );
	}
	if ( ! empty( $input['business_name'] ) ) {
		$name = sanitize_text_field( $input['business_name'] );
		wp_update_user(
			array(
				'ID'            => $user_id,
				'display_name'  => $name,
				'user_nicename' => tac_supplier_slug( $name, $user_id ),
			)
		);
	}
	if ( ! empty( $input['acceptTerms'] ) && ! tac_supplier_meta( $user_id, 'terms_accepted' ) ) {
		update_user_meta( $user_id, 'sp_terms_accepted', current_time( 'mysql' ) );
	}
}

/* ---------- Uploads (photos for listings, logo, documents) ---------- */

/**
 * Store an uploaded file in the Media Library, owned by the supplier.
 *
 * @return int|WP_Error Attachment id.
 */
function tac_supplier_upload( WP_REST_Request $req, $user_id, array $mimes ) {
	$files = $req->get_file_params();
	if ( empty( $files['file'] ) || ! empty( $files['file']['error'] ) ) {
		return new WP_Error( 'no_file', __( 'Choose a file to upload.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	if ( $files['file']['size'] > 8 * MB_IN_BYTES ) {
		return new WP_Error( 'too_big', __( 'Files can be up to 8 MB.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	$check = wp_check_filetype_and_ext( $files['file']['tmp_name'], $files['file']['name'], $mimes );
	if ( ! $check['type'] ) {
		return new WP_Error( 'bad_type', __( 'This file type is not allowed.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$previous = get_current_user_id();
	wp_set_current_user( $user_id ); // Owner of the attachment.
	$id = media_handle_sideload(
		array(
			'name'     => sanitize_file_name( $files['file']['name'] ),
			'tmp_name' => $files['file']['tmp_name'],
		),
		0,
		null,
		array( 'post_author' => $user_id )
	);
	wp_set_current_user( $previous );
	return $id;
}

/**
 * Find the logo on the supplier's own website and make it their logo, so the logo on the
 * platform is the same as on their site. Looks for, in order: an <img> whose class, id, alt
 * or file name says "logo"; an og:logo / schema logo; the apple-touch-icon; the largest icon.
 * Only public http(s) addresses are fetched (wp_safe_remote_get).
 *
 * @return int|WP_Error Attachment id.
 */
function tac_logo_from_website( $user_id ) {
	$site = tac_clean_website( tac_supplier_meta( $user_id, 'website' ) );
	if ( '' === $site ) {
		return tac_website_error();
	}
	$not_found = new WP_Error( 'logo_not_found', __( 'We could not find a logo on your website. Download it from your site and upload it here instead.', 'travel-agency-core' ), array( 'status' => 422 ) );
	$res       = wp_safe_remote_get( $site, array( 'timeout' => 10, 'redirection' => 3, 'limit_response_size' => 2 * MB_IN_BYTES, 'user-agent' => 'Mozilla/5.0 (compatible; ' . tac_site_name() . ')' ) );
	if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
		return new WP_Error( 'site_unreachable', __( 'We could not open your website. Check the address in your profile, or upload your logo instead.', 'travel-agency-core' ), array( 'status' => 422 ) );
	}
	$html = (string) wp_remote_retrieve_body( $res );
	$base = $site;
	if ( preg_match( '/<base[^>]+href=["\']([^"\']+)/i', $html, $m ) ) {
		$base = WP_Http::make_absolute_url( $m[1], $site );
	}
	$candidates = array();
	// <img> tags that are the logo (header logos come first in the page).
	if ( preg_match_all( '/<img\b[^>]*>/i', $html, $imgs ) ) {
		foreach ( $imgs[0] as $tag ) {
			if ( ! preg_match( '/logo/i', $tag ) ) {
				continue;
			}
			foreach ( array( 'data-src', 'src' ) as $attr ) {
				if ( preg_match( '/\s' . $attr . '=["\']([^"\']+)/i', $tag, $m ) && 0 !== strpos( $m[1], 'data:' ) ) {
					$candidates[] = $m[1];
					break;
				}
			}
		}
	}
	if ( preg_match( '/<meta[^>]+property=["\']og:logo["\'][^>]*content=["\']([^"\']+)/i', $html, $m ) ) {
		$candidates[] = $m[1];
	}
	if ( preg_match( '/"logo"\s*:\s*(?:\{[^}]*"url"\s*:\s*)?"([^"]+)"/i', $html, $m ) ) {
		$candidates[] = stripslashes( $m[1] );
	}
	if ( preg_match( '/<link[^>]+rel=["\']apple-touch-icon[^"\']*["\'][^>]*href=["\']([^"\']+)/i', $html, $m ) ) {
		$candidates[] = $m[1];
	}
	if ( preg_match_all( '/<link[^>]+rel=["\'](?:shortcut )?icon["\'][^>]*>/i', $html, $icons ) ) {
		usort( $icons[0], fn( $a, $b ) => ( preg_match( '/sizes=["\'](\d+)/', $b, $x ) ? (int) $x[1] : 0 ) <=> ( preg_match( '/sizes=["\'](\d+)/', $a, $y ) ? (int) $y[1] : 0 ) );
		foreach ( $icons[0] as $tag ) {
			if ( preg_match( '/href=["\']([^"\']+)/i', $tag, $m ) ) {
				$candidates[] = $m[1];
			}
		}
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	foreach ( array_slice( array_unique( $candidates ), 0, 6 ) as $src ) {
		$url = WP_Http::make_absolute_url( html_entity_decode( trim( $src ) ), $base );
		if ( ! preg_match( '#^https?://#i', $url ) ) {
			continue;
		}
		$tmp = download_url( $url, 15 ); // Uses wp_safe_remote_get: public addresses only.
		if ( is_wp_error( $tmp ) ) {
			continue;
		}
		$name  = sanitize_file_name( basename( (string) wp_parse_url( $url, PHP_URL_PATH ) ) ) ?: 'logo';
		$check = wp_check_filetype_and_ext( $tmp, $name, tac_image_mimes() );
		if ( ! $check['type'] ) {
			// The file name may have no extension: trust the real image type.
			$info = @getimagesize( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			$ext  = array( 'image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp' )[ $info['mime'] ?? '' ] ?? '';
			if ( ! $ext ) {
				wp_delete_file( $tmp ); // SVG, ICO…: not supported, try the next one.
				continue;
			}
			$name = 'logo.' . $ext;
		}
		$size = @getimagesize( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		if ( ! $size || $size[0] < 48 || $size[1] < 24 || filesize( $tmp ) > 8 * MB_IN_BYTES ) {
			wp_delete_file( $tmp ); // Too small to be a usable logo (e.g. a 16px favicon).
			continue;
		}
		$previous = get_current_user_id();
		wp_set_current_user( $user_id );
		$id = media_handle_sideload( array( 'name' => $name, 'tmp_name' => $tmp ), 0, null, array( 'post_author' => $user_id ) );
		wp_set_current_user( $previous );
		if ( is_wp_error( $id ) ) {
			wp_delete_file( $tmp );
			continue;
		}
		update_user_meta( $user_id, 'sp_logo_id', $id );
		update_post_meta( $id, '_tac_logo_source', esc_url_raw( $url ) );
		return $id;
	}
	return $not_found;
}

function tac_image_mimes() {
	return array(
		'jpg|jpeg|jpe' => 'image/jpeg',
		'png'          => 'image/png',
		'webp'         => 'image/webp',
	);
}

/* ---------- Routes ---------- */

add_action( 'rest_api_init', 'tac_register_supplier_routes' );

function tac_register_supplier_routes() {
	$ns = 'travel/v1';

	register_rest_route(
		$ns,
		'/auth/register',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_register_supplier',
			'permission_callback' => '__return_true',
			'args'                => array(
				'name'         => array( 'type' => 'string', 'required' => true, 'minLength' => 2, 'maxLength' => 80, 'sanitize_callback' => 'sanitize_text_field' ),
				'email'        => array( 'type' => 'string', 'required' => true, 'format' => 'email' ),
				'password'     => array( 'type' => 'string', 'required' => true, 'minLength' => 8, 'maxLength' => 200 ),
				'businessName' => array( 'type' => 'string', 'default' => '', 'maxLength' => 120, 'sanitize_callback' => 'sanitize_text_field' ),
				'acceptTerms'  => array( 'type' => 'boolean', 'required' => true ),
				'website'      => array( 'type' => 'string', 'default' => '' ), // Honeypot.
				'siteUrl'      => array( 'type' => 'string', 'default' => '' ), // The supplier's real website (required).
			),
		)
	);

	register_rest_route(
		$ns,
		'/auth/login',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_login',
			'permission_callback' => '__return_true',
			'args'                => array(
				'email'    => array( 'type' => 'string', 'required' => true ),
				'password' => array( 'type' => 'string', 'required' => true ),
			),
		)
	);

	register_rest_route(
		$ns,
		'/supplier/me',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => fn( WP_REST_Request $req ) => tac_format_supplier( get_userdata( $req['_tac_user'] ) ),
				'permission_callback' => 'tac_require_supplier',
			),
			array(
				'methods'             => 'PUT',
				'callback'            => function ( WP_REST_Request $req ) {
					$input   = (array) $req->get_json_params();
					$profile = (array) ( $input['profile'] ?? array() );
					$uid     = (int) $req['_tac_user'];
					if ( array_key_exists( 'website', $profile ) && '' === tac_clean_website( $profile['website'] ) ) {
						return tac_website_error();
					}
					if ( array_key_exists( 'website', $profile ) || array_key_exists( 'business_name', $profile ) ) {
						$error = tac_business_name_error(
							$profile['business_name'] ?? tac_supplier_meta( $uid, 'business_name' ),
							$profile['website'] ?? tac_supplier_meta( $uid, 'website' ),
							$uid
						);
						if ( $error ) {
							return $error;
						}
					}
					tac_save_supplier_profile( $req['_tac_user'], (array) ( $input['profile'] ?? array() ) + array( 'acceptTerms' => ! empty( $input['acceptTerms'] ) ) );
					return tac_format_supplier( get_userdata( $req['_tac_user'] ) );
				},
				'permission_callback' => 'tac_require_supplier',
			),
		)
	);

	register_rest_route(
		$ns,
		'/supplier/password',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => function ( WP_REST_Request $req ) {
				$user = get_userdata( $req['_tac_user'] );
				if ( ! wp_check_password( (string) $req['current'], $user->user_pass, $user->ID ) ) {
					return new WP_Error( 'wrong_password', __( 'Your current password is not correct.', 'travel-agency-core' ), array( 'status' => 400 ) );
				}
				$weak = tac_password_error( $req['new'], $user->user_email );
				if ( $weak ) {
					return $weak;
				}
				wp_set_password( (string) $req['new'], $user->ID ); // Also signs out other sessions.
				tac_revoke_tokens( $user->ID );
				return array( 'token' => tac_issue_token( $user->ID ) );
			},
			'permission_callback' => 'tac_require_supplier',
			'args'                => array(
				'current' => array( 'type' => 'string', 'required' => true ),
				'new'     => array( 'type' => 'string', 'required' => true, 'minLength' => 8, 'maxLength' => 200 ),
			),
		)
	);

	register_rest_route(
		$ns,
		'/supplier/logo/from-website',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => function ( WP_REST_Request $req ) {
				if ( tac_throttled( 'logo_fetch_' . $req['_tac_user'], 10 ) ) {
					return new WP_Error( 'too_many_requests', __( 'Too many tries. Upload your logo instead.', 'travel-agency-core' ), array( 'status' => 429 ) );
				}
				$id = tac_logo_from_website( $req['_tac_user'] );
				return is_wp_error( $id ) ? $id : tac_format_supplier( get_userdata( $req['_tac_user'] ) );
			},
			'permission_callback' => 'tac_require_supplier',
		)
	);

	register_rest_route(
		$ns,
		'/supplier/uploads',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => function ( WP_REST_Request $req ) {
				if ( tac_throttled( 'upload_' . $req['_tac_user'], 120 ) ) {
					return new WP_Error( 'too_many_requests', __( 'Too many uploads. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
				}
				$kind = (string) $req['kind'];
				$id   = tac_supplier_upload( $req, $req['_tac_user'], 'document' === $kind ? tac_image_mimes() + array( 'pdf' => 'application/pdf' ) : tac_image_mimes() );
				if ( is_wp_error( $id ) ) {
					return $id;
				}
				$user_id = $req['_tac_user'];
				if ( 'logo' === $kind ) {
					update_user_meta( $user_id, 'sp_logo_id', $id );
				} elseif ( 'document' === $kind ) {
					update_post_meta( $id, '_tac_supplier_document', $user_id );
					update_user_meta( $user_id, 'sp_documents', implode( ',', array_merge( tac_supplier_document_ids( $user_id ), array( $id ) ) ) );
				}
				return array(
					'id'    => $id,
					'url'   => wp_get_attachment_image_url( $id, 'large' ) ? wp_get_attachment_image_url( $id, 'large' ) : wp_get_attachment_url( $id ),
					'thumb' => wp_get_attachment_image_url( $id, 'medium' ),
					'name'  => get_the_title( $id ),
				);
			},
			'permission_callback' => 'tac_require_supplier',
			'args'                => array( 'kind' => array( 'type' => 'string', 'enum' => array( 'photo', 'logo', 'document' ), 'default' => 'photo' ) ),
		)
	);

	register_rest_route(
		$ns,
		'/supplier/documents/(?P<id>\d+)',
		array(
			'methods'             => WP_REST_Server::DELETABLE,
			'callback'            => function ( WP_REST_Request $req ) {
				$user_id = $req['_tac_user'];
				$ids     = tac_supplier_document_ids( $user_id );
				if ( ! in_array( (int) $req['id'], $ids, true ) ) {
					return new WP_Error( 'not_found', __( 'Document not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
				}
				wp_delete_attachment( (int) $req['id'], true );
				update_user_meta( $user_id, 'sp_documents', implode( ',', array_diff( $ids, array( (int) $req['id'] ) ) ) );
				return tac_format_supplier( get_userdata( $user_id ) );
			},
			'permission_callback' => 'tac_require_supplier',
		)
	);

	register_rest_route(
		$ns,
		'/supplier/verification',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => function ( WP_REST_Request $req ) {
				$user_id = $req['_tac_user'];
				$missing = array_filter( tac_supplier_checklist( $user_id ), fn( $i ) => ! $i['done'] && ! $i['optional'] );
				if ( $missing ) {
					return new WP_Error( 'incomplete', __( 'Complete your profile first:', 'travel-agency-core' ) . ' ' . implode( ', ', wp_list_pluck( $missing, 'label' ) ), array( 'status' => 400 ) );
				}
				update_user_meta( $user_id, 'sp_verification', 'pending' );
				$user = get_userdata( $user_id );
				wp_mail(
					get_option( 'admin_email' ),
					sprintf( '[%s] Supplier verification request: %s', tac_site_name(), $user->display_name ),
					sprintf( "%s asked to be verified.\n\nApprove the business or ask for changes: %s", $user->display_name, admin_url( 'admin.php?page=tac-marketplace&tab=businesses' ) )
				);
				return tac_format_supplier( $user );
			},
			'permission_callback' => 'tac_require_supplier',
		)
	);

	register_rest_route(
		$ns,
		'/suppliers/(?P<slug>[a-z0-9_-]+)',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => function ( WP_REST_Request $req ) {
				$user = get_user_by( 'slug', $req['slug'] );
				if ( ! $user || ! tac_is_supplier( $user ) || tac_is_suspended( $user->ID ) ) {
					return new WP_Error( 'not_found', __( 'Supplier not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
				}
				$tours = get_posts( array( 'post_type' => 'tour', 'post_status' => 'publish', 'author' => $user->ID, 'numberposts' => 50 ) );
				$ids   = wp_list_pluck( $tours, 'ID' );
				// Rating across all their listings, weighted by number of reviews.
				$count = 0;
				$sum   = 0.0;
				foreach ( $ids as $id ) {
					$n      = (int) get_post_meta( $id, 'review_count', true );
					$count += $n;
					$sum   += $n * (float) get_post_meta( $id, 'rating', true );
				}
				$reviews = $ids ? get_comments( array( 'post__in' => $ids, 'status' => 'approve', 'meta_key' => 'rating', 'number' => 3, 'orderby' => 'comment_date_gmt', 'order' => 'DESC' ) ) : array();
				return array(
					'supplier' => tac_public_supplier( $user ) + array(
						'coverage' => (string) tac_supplier_meta( $user->ID, 'service_coverage' ),
						'stats'    => array(
							'listings' => count( $ids ),
							'reviews'  => $count,
							'rating'   => $count ? round( $sum / $count, 1 ) : 0,
						),
					),
					'tours'    => array_map( 'tac_format_tour', $tours ),
					'reviews'  => array_map(
						fn( $c ) => tac_format_review( $c ) + array(
							'listing' => array( 'title' => get_the_title( $c->comment_post_ID ), 'slug' => get_post_field( 'post_name', $c->comment_post_ID ) ),
						),
						$reviews
					),
				);
			},
			'permission_callback' => '__return_true',
		)
	);
}

function tac_session_for( WP_User $user ) {
	return array(
		'token' => tac_issue_token( $user->ID ),
		'user'  => tac_format_supplier( $user ),
	);
}

function tac_rest_register_supplier( WP_REST_Request $req ) {
	if ( '' !== (string) $req['website'] ) {
		return new WP_Error( 'spam', __( 'Could not create your account.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	if ( tac_throttled( 'register', 5 ) ) {
		return new WP_Error( 'too_many_requests', __( 'Too many sign-ups from this connection. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}
	$weak = tac_password_error( $req['password'], $req['email'] );
	if ( $weak ) {
		return $weak;
	}
	$site = tac_clean_website( $req['siteUrl'] );
	if ( '' === $site ) {
		return tac_website_error();
	}
	$name_error = tac_business_name_error( $req['businessName'], $site );
	if ( $name_error ) {
		return $name_error;
	}
	if ( ! $req['acceptTerms'] ) {
		return new WP_Error( 'terms', __( 'Please accept the supplier terms.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	$email = sanitize_email( $req['email'] );
	if ( email_exists( $email ) ) {
		return new WP_Error( 'exists', __( 'An account with this email already exists. Sign in instead.', 'travel-agency-core' ), array( 'status' => 409 ) );
	}
	$base  = sanitize_user( strstr( $email, '@', true ), true ) ?: 'supplier';
	$login = $base;
	for ( $i = 2; username_exists( $login ); $i++ ) {
		$login = $base . $i;
	}
	$user_id = wp_insert_user(
		array(
			'user_login'   => $login,
			'user_email'   => $email,
			'user_pass'    => (string) $req['password'],
			'display_name' => $req['businessName'],
			'user_nicename'=> tac_supplier_slug( $req['businessName'] ),
			'first_name'   => $req['name'],
			'role'         => TAC_SUPPLIER_ROLE,
		)
	);
	if ( is_wp_error( $user_id ) ) {
		return new WP_Error( 'account_failed', __( 'Could not create your account.', 'travel-agency-core' ), array( 'status' => 500 ) );
	}
	tac_save_supplier_profile(
		$user_id,
		array(
			'business_name' => $req['businessName'],
			'contact_name'  => $req['name'],
			'website'       => $site,
			'notify_email'  => true,
			'acceptTerms'   => true,
		)
	);
	wp_mail(
		get_option( 'admin_email' ),
		sprintf( '[%s] New supplier: %s', tac_site_name(), $req['businessName'] ? $req['businessName'] : $req['name'] ),
		sprintf( "A new supplier signed up (%s).\n\n%s", $email, admin_url( 'users.php?role=' . TAC_SUPPLIER_ROLE ) )
	);
	return new WP_REST_Response( tac_session_for( get_userdata( $user_id ) ), 201 );
}

function tac_rest_login( WP_REST_Request $req ) {
	$user = tac_check_credentials( $req['email'], $req['password'] );
	if ( is_wp_error( $user ) ) {
		return $user;
	}
	if ( ! tac_is_supplier( $user ) ) {
		return new WP_Error( 'not_supplier', __( 'This account is not a supplier account.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}
	return tac_session_for( $user );
}

/* ---------- wp-admin: supplier section on the user screen ---------- */

add_action( 'show_user_profile', 'tac_admin_supplier_section' );
add_action( 'edit_user_profile', 'tac_admin_supplier_section' );

function tac_admin_supplier_section( WP_User $user ) {
	if ( ! in_array( TAC_SUPPLIER_ROLE, (array) $user->roles, true ) || ! current_user_can( 'edit_users' ) ) {
		return;
	}
	$status   = tac_supplier_status( $user->ID );
	$statuses = array(
		'unverified' => __( 'Not submitted', 'travel-agency-core' ),
		'pending'    => __( 'Waiting for review', 'travel-agency-core' ),
		'verified'   => __( 'Verified', 'travel-agency-core' ),
		'rejected'   => __( 'Changes needed', 'travel-agency-core' ),
	);
	?>
	<h2 id="tac-supplier"><?php esc_html_e( 'Supplier', 'travel-agency-core' ); ?></h2>
	<table class="form-table">
		<?php foreach ( tac_supplier_fields() as $key => $def ) : ?>
			<?php
			$value = (string) tac_supplier_meta( $user->ID, $key );
			if ( 'business_type' === $key ) {
				$value = tac_business_types()[ $value ] ?? $value;
			}
			?>
			<tr><th><?php echo esc_html( $def[0] ); ?></th><td><?php echo nl2br( esc_html( 'boolean' === $def[1] ? ( '0' === $value ? __( 'No', 'travel-agency-core' ) : __( 'Yes', 'travel-agency-core' ) ) : ( '' === $value ? '—' : $value ) ) ); ?></td></tr>
		<?php endforeach; ?>
		<tr><th><?php esc_html_e( 'Terms accepted', 'travel-agency-core' ); ?></th><td><?php echo esc_html( (string) tac_supplier_meta( $user->ID, 'terms_accepted' ) ?: '—' ); ?></td></tr>
		<tr>
			<th><?php esc_html_e( 'Documents', 'travel-agency-core' ); ?></th>
			<td>
				<?php
				$docs = tac_supplier_document_ids( $user->ID );
				if ( ! $docs ) {
					echo '—';
				}
				foreach ( $docs as $id ) {
					echo '<a href="' . esc_url( wp_get_attachment_url( $id ) ) . '" target="_blank" rel="noopener">' . esc_html( get_the_title( $id ) ) . '</a><br>';
				}
				?>
			</td>
		</tr>
		<tr>
			<th><label for="tac_verification"><?php esc_html_e( 'Verification', 'travel-agency-core' ); ?></label></th>
			<td>
				<select name="tac_verification" id="tac_verification">
					<?php foreach ( $statuses as $value => $label ) : ?>
						<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $status, $value ); ?>><?php echo esc_html( $label ); ?></option>
					<?php endforeach; ?>
				</select>
				<p><textarea name="tac_verification_note" rows="2" class="large-text" placeholder="<?php esc_attr_e( 'Message to the supplier (e.g. what to change)', 'travel-agency-core' ); ?>"><?php echo esc_textarea( (string) tac_supplier_meta( $user->ID, 'verification_note' ) ); ?></textarea></p>
				<p class="description"><?php esc_html_e( 'The supplier is emailed when you verify the account or ask for changes. Check permits, licences and insurance for activities that need them.', 'travel-agency-core' ); ?></p>
			</td>
		</tr>
	</table>
	<?php
}

add_action( 'personal_options_update', 'tac_admin_save_supplier_section' );
add_action( 'edit_user_profile_update', 'tac_admin_save_supplier_section' );

function tac_admin_save_supplier_section( $user_id ) {
	if ( ! isset( $_POST['tac_verification'] ) || ! current_user_can( 'edit_users' ) ) { // phpcs:ignore WordPress.Security.NonceVerification -- core checks the profile form nonce.
		return;
	}
	$new  = sanitize_key( wp_unslash( $_POST['tac_verification'] ) ); // phpcs:ignore WordPress.Security.NonceVerification
	$note = sanitize_textarea_field( wp_unslash( $_POST['tac_verification_note'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification
	if ( in_array( $new, array( 'unverified', 'pending', 'verified', 'rejected' ), true ) ) {
		tac_set_supplier_verification( $user_id, $new, $note );
	}
}
