<?php
/**
 * Traveller accounts: sign up and sign in with email and password, read and update the
 * name and phone. Signed-in travellers see their requests in My bookings (bookings.php).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', 'tac_register_profile_routes' );

function tac_register_profile_routes() {
	register_rest_route(
		'travel/v1',
		'/auth/traveller/register',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_register_traveller',
			'permission_callback' => '__return_true',
			'args'                => array(
				'name'     => array( 'type' => 'string', 'required' => true, 'minLength' => 2, 'maxLength' => 80, 'sanitize_callback' => 'sanitize_text_field' ),
				'email'    => array( 'type' => 'string', 'required' => true, 'format' => 'email' ),
				'password' => array( 'type' => 'string', 'required' => true, 'minLength' => 8, 'maxLength' => 200 ),
				'website'  => array( 'type' => 'string', 'default' => '' ), // Honeypot.
			),
		)
	);

	register_rest_route(
		'travel/v1',
		'/auth/traveller/login',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_login_traveller',
			'permission_callback' => '__return_true',
			'args'                => array(
				'email'    => array( 'type' => 'string', 'required' => true ),
				'password' => array( 'type' => 'string', 'required' => true ),
			),
		)
	);

	register_rest_route(
		'travel/v1',
		'/me',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function ( WP_REST_Request $req ) {
					return tac_format_user( get_userdata( $req['_tac_user'] ) );
				},
				'permission_callback' => 'tac_require_host',
			),
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => 'tac_rest_update_profile',
				'permission_callback' => 'tac_require_host',
				'args'                => array(
					'name'  => array( 'type' => 'string', 'minLength' => 2, 'maxLength' => 80, 'sanitize_callback' => 'sanitize_text_field' ),
					'phone' => array( 'type' => 'string', 'maxLength' => 30, 'sanitize_callback' => 'sanitize_text_field' ),
				),
			),
		)
	);
}

function tac_rest_update_profile( WP_REST_Request $req ) {
	$user_id = (int) $req['_tac_user'];
	if ( null !== $req['name'] ) {
		wp_update_user( array( 'ID' => $user_id, 'display_name' => $req['name'] ) );
	}
	if ( null !== $req['phone'] ) {
		update_user_meta( $user_id, 'tac_phone', $req['phone'] );
	}
	return tac_format_user( get_userdata( $user_id ) );
}

function tac_traveller_session( WP_User $user ) {
	return array(
		'token' => tac_issue_token( $user->ID ),
		'user'  => tac_format_user( $user ),
	);
}

function tac_rest_register_traveller( WP_REST_Request $req ) {
	if ( '' !== (string) $req['website'] ) {
		return new WP_Error( 'spam', __( 'Could not create your account.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	if ( tac_throttled( 'register', 5 ) ) {
		return new WP_Error( 'too_many_requests', __( 'Too many sign-ups from this connection. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}
	$email = sanitize_email( $req['email'] );
	if ( email_exists( $email ) ) {
		return new WP_Error( 'exists', __( 'An account with this email already exists. Sign in instead.', 'travel-agency-core' ), array( 'status' => 409 ) );
	}
	$base  = sanitize_user( strstr( $email, '@', true ), true ) ?: 'traveller';
	$login = $base;
	for ( $i = 2; username_exists( $login ); $i++ ) {
		$login = $base . $i;
	}
	$user_id = wp_insert_user(
		array(
			'user_login'   => $login,
			'user_email'   => $email,
			'user_pass'    => (string) $req['password'],
			'display_name' => $req['name'],
			'first_name'   => $req['name'],
			'role'         => 'subscriber',
		)
	);
	if ( is_wp_error( $user_id ) ) {
		return new WP_Error( 'account_failed', __( 'Could not create your account.', 'travel-agency-core' ), array( 'status' => 500 ) );
	}
	return new WP_REST_Response( tac_traveller_session( get_userdata( $user_id ) ), 201 );
}

/** Any account can sign in as a traveller (a supplier booking someone else's tour, too). */
function tac_rest_login_traveller( WP_REST_Request $req ) {
	if ( tac_throttled( 'login', 20 ) ) {
		return new WP_Error( 'too_many_requests', __( 'Too many sign-in attempts. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}
	$login = (string) $req['email'];
	$found = is_email( $login ) ? get_user_by( 'email', $login ) : get_user_by( 'login', $login );
	$user  = $found ? wp_authenticate( $found->user_login, (string) $req['password'] ) : null;
	if ( ! $user || is_wp_error( $user ) ) {
		return new WP_Error( 'invalid_login', __( 'Wrong email or password.', 'travel-agency-core' ), array( 'status' => 401 ) );
	}
	if ( tac_is_suspended( $user->ID ) ) {
		return new WP_Error( 'suspended', __( 'This account is suspended. Please contact us.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}
	return tac_traveller_session( $user );
}
