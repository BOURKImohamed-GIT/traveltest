<?php
/**
 * Accounts for listing owners ("hosts"): Google sign-in and API session tokens.
 *
 * Flow: the React app gets a Google ID token from Google Identity Services and
 * posts it to /travel/v1/auth/google. We verify it with Google, find or create
 * a WordPress user with the `travel_host` role, and return a signed session
 * token the app sends as `Authorization: Bearer <token>` on host routes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_HOST_ROLE     = 'travel_host';
const TAC_TOKEN_SECONDS = 30 * DAY_IN_SECONDS;

add_action( 'init', 'tac_register_host_role' );

function tac_register_host_role() {
	if ( ! get_role( TAC_HOST_ROLE ) ) {
		add_role( TAC_HOST_ROLE, __( 'Listing owner', 'travel-agency-core' ), array( 'read' => true ) );
	}
}

function tac_google_client_id() {
	return defined( 'TRAVEL_GOOGLE_CLIENT_ID' ) ? (string) TRAVEL_GOOGLE_CLIENT_ID : '';
}

/* ---------- Session tokens ---------- */

function tac_b64url( $data ) {
	return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
}

function tac_b64url_decode( $data ) {
	return base64_decode( strtr( $data, '-_', '+/' ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
}

function tac_issue_token( $user_id ) {
	$payload = wp_json_encode(
		array(
			'uid' => (int) $user_id,
			'exp' => time() + TAC_TOKEN_SECONDS,
			// Changing the user's password or calling tac_revoke_tokens() invalidates old tokens.
			'v'   => (int) get_user_meta( $user_id, 'tac_token_version', true ),
		)
	);
	return tac_b64url( $payload ) . '.' . tac_b64url( hash_hmac( 'sha256', $payload, wp_salt( 'auth' ), true ) );
}

/**
 * @return WP_User|null The user a valid bearer token belongs to.
 */
function tac_user_from_request( WP_REST_Request $req ) {
	$header = (string) $req->get_header( 'authorization' );
	if ( ! preg_match( '/^Bearer\s+([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/', $header, $m ) ) {
		return null;
	}
	$payload = tac_b64url_decode( $m[1] );
	$sig     = tac_b64url_decode( $m[2] );
	if ( ! $payload || ! hash_equals( hash_hmac( 'sha256', $payload, wp_salt( 'auth' ), true ), (string) $sig ) ) {
		return null;
	}
	$data = json_decode( $payload, true );
	if ( ! is_array( $data ) || empty( $data['uid'] ) || empty( $data['exp'] ) || $data['exp'] < time() ) {
		return null;
	}
	$user = get_userdata( (int) $data['uid'] );
	if ( ! $user || (int) get_user_meta( $user->ID, 'tac_token_version', true ) !== (int) ( $data['v'] ?? 0 ) ) {
		return null;
	}
	return $user;
}

function tac_revoke_tokens( $user_id ) {
	update_user_meta( $user_id, 'tac_token_version', (int) get_user_meta( $user_id, 'tac_token_version', true ) + 1 );
}

/**
 * permission_callback for host routes.
 */
function tac_require_host( WP_REST_Request $req ) {
	$user = tac_user_from_request( $req );
	if ( ! $user ) {
		return new WP_Error( 'unauthorized', __( 'Please sign in again.', 'travel-agency-core' ), array( 'status' => 401 ) );
	}
	$req->set_param( '_tac_user', $user->ID );
	return true;
}

/**
 * "client" (books trips) or "supplier" (publishes listings and answers requests).
 */
function tac_account_type( $user_id ) {
	return 'supplier' === get_user_meta( $user_id, 'tac_account_type', true ) ? 'supplier' : 'client';
}

function tac_set_account_type( $user_id, $type ) {
	if ( in_array( $type, array( 'client', 'supplier' ), true ) ) {
		update_user_meta( $user_id, 'tac_account_type', $type );
	}
}

function tac_format_user( WP_User $user ) {
	return array(
		'id'          => $user->ID,
		'name'        => $user->display_name,
		'email'       => $user->user_email,
		'avatar'      => (string) get_user_meta( $user->ID, 'tac_avatar', true ),
		'phone'       => (string) get_user_meta( $user->ID, 'tac_phone', true ),
		'accountType' => tac_account_type( $user->ID ),
	);
}

/* ---------- Google ---------- */

/**
 * Verify a Google ID token with Google and return its claims, or WP_Error.
 */
function tac_verify_google_token( $credential ) {
	$client_id = tac_google_client_id();
	if ( ! $client_id ) {
		return new WP_Error( 'google_not_configured', __( 'Google sign-in is not set up on this site yet.', 'travel-agency-core' ), array( 'status' => 503 ) );
	}
	$res = wp_remote_get( 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode( $credential ), array( 'timeout' => 10 ) );
	if ( is_wp_error( $res ) ) {
		return new WP_Error( 'google_unreachable', __( 'Could not reach Google. Try again.', 'travel-agency-core' ), array( 'status' => 502 ) );
	}
	$claims = json_decode( wp_remote_retrieve_body( $res ), true );
	$valid  = 200 === wp_remote_retrieve_response_code( $res )
		&& is_array( $claims )
		&& ( $claims['aud'] ?? '' ) === $client_id
		&& in_array( $claims['iss'] ?? '', array( 'accounts.google.com', 'https://accounts.google.com' ), true )
		&& (int) ( $claims['exp'] ?? 0 ) > time()
		&& 'true' === (string) ( $claims['email_verified'] ?? '' )
		&& ! empty( $claims['sub'] ) && is_email( $claims['email'] ?? '' );
	if ( ! $valid ) {
		return new WP_Error( 'google_invalid', __( 'Google sign-in failed. Try again.', 'travel-agency-core' ), array( 'status' => 401 ) );
	}
	return $claims;
}

/**
 * Find the user for a Google account, creating a host account on first sign-in.
 */
function tac_user_for_google( array $claims ) {
	$by_sub = get_users(
		array(
			'meta_key'   => 'tac_google_sub', // phpcs:ignore WordPress.DB.SlowDBQuery
			'meta_value' => $claims['sub'], // phpcs:ignore WordPress.DB.SlowDBQuery
			'number'     => 1,
		)
	);
	$user = $by_sub ? $by_sub[0] : get_user_by( 'email', $claims['email'] );

	if ( ! $user ) {
		$base  = sanitize_user( strstr( $claims['email'], '@', true ), true ) ?: 'host';
		$login = $base;
		for ( $i = 2; username_exists( $login ); $i++ ) {
			$login = $base . $i;
		}
		$user_id = wp_insert_user(
			array(
				'user_login'   => $login,
				'user_email'   => $claims['email'],
				'user_pass'    => wp_generate_password( 32, true, true ),
				'display_name' => sanitize_text_field( $claims['name'] ?? $login ),
				'first_name'   => sanitize_text_field( $claims['given_name'] ?? '' ),
				'last_name'    => sanitize_text_field( $claims['family_name'] ?? '' ),
				'role'         => TAC_HOST_ROLE,
			)
		);
		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}
		$user = get_userdata( $user_id );
	}

	update_user_meta( $user->ID, 'tac_google_sub', sanitize_text_field( $claims['sub'] ) );
	if ( ! empty( $claims['picture'] ) ) {
		update_user_meta( $user->ID, 'tac_avatar', esc_url_raw( $claims['picture'] ) );
	}
	return $user;
}

/* ---------- Routes ---------- */

add_action( 'rest_api_init', 'tac_register_auth_routes' );

function tac_register_auth_routes() {
	register_rest_route(
		'travel/v1',
		'/auth/config',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => function () {
				return array(
					'googleClientId' => tac_google_client_id(),
					'devLogin'       => tac_dev_login_enabled(),
				);
			},
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'travel/v1',
		'/auth/google',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_auth_google',
			'permission_callback' => '__return_true',
			'args'                => array(
				'credential'  => array( 'type' => 'string', 'required' => true ),
				'accountType' => array( 'type' => 'string', 'enum' => array( 'client', 'supplier' ) ),
			),
		)
	);

	register_rest_route(
		'travel/v1',
		'/auth/dev',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_auth_dev',
			'permission_callback' => 'tac_dev_login_enabled',
			'args'                => array(
				'email'       => array( 'type' => 'string', 'required' => true, 'format' => 'email' ),
				'name'        => array( 'type' => 'string', 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
				'accountType' => array( 'type' => 'string', 'enum' => array( 'client', 'supplier' ) ),
			),
		)
	);
}

function tac_rest_auth_google( WP_REST_Request $req ) {
	if ( tac_throttled( 'auth', 20 ) ) {
		return new WP_Error( 'too_many_requests', __( 'Too many sign-in attempts. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}
	$claims = tac_verify_google_token( (string) $req['credential'] );
	if ( is_wp_error( $claims ) ) {
		return $claims;
	}
	$user = tac_user_for_google( $claims );
	if ( is_wp_error( $user ) ) {
		return new WP_Error( 'account_failed', __( 'Could not create your account.', 'travel-agency-core' ), array( 'status' => 500 ) );
	}
	if ( $req['accountType'] ) {
		tac_set_account_type( $user->ID, $req['accountType'] );
	}
	return array(
		'token' => tac_issue_token( $user->ID ),
		'user'  => tac_format_user( $user ),
	);
}

/**
 * Local development only: sign in without Google. Enable with
 * define( 'TRAVEL_DEV_LOGIN', true ) on a site that also has WP_DEBUG on.
 * Never enable it on a public site.
 */
function tac_dev_login_enabled() {
	return defined( 'TRAVEL_DEV_LOGIN' ) && TRAVEL_DEV_LOGIN && defined( 'WP_DEBUG' ) && WP_DEBUG;
}

function tac_rest_auth_dev( WP_REST_Request $req ) {
	$user = tac_user_for_google(
		array(
			'sub'   => 'dev-' . md5( strtolower( $req['email'] ) ),
			'email' => sanitize_email( $req['email'] ),
			'name'  => $req['name'],
		)
	);
	if ( is_wp_error( $user ) ) {
		return $user;
	}
	if ( $req['accountType'] ) {
		tac_set_account_type( $user->ID, $req['accountType'] );
	}
	return array(
		'token' => tac_issue_token( $user->ID ),
		'user'  => tac_format_user( $user ),
	);
}
