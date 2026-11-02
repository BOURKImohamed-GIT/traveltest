<?php
/**
 * Account security for suppliers and travellers:
 * - sign-in with a per-account lockout after repeated wrong passwords;
 * - password rules;
 * - "forgot password" handled in the app: the email links to /reset-password on the site,
 *   never to wp-login.php, and a reset signs out every device;
 * - suppliers and travellers never reach wp-admin or the WordPress toolbar;
 * - sign out of all devices, change password and delete account (travellers).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_LOCK_ATTEMPTS = 5;
const TAC_LOCK_SECONDS  = 15 * MINUTE_IN_SECONDS;

/** Site staff (admins, editors): the only accounts that use wp-admin. */
function tac_is_staff( $user ) {
	return user_can( $user, 'edit_posts' );
}

/* ---------- Passwords ---------- */

/**
 * @return string Empty when the password is acceptable, else what is wrong with it.
 */
function tac_password_problem( $password, $email = '' ) {
	$password = (string) $password;
	if ( strlen( $password ) < 8 ) {
		return __( 'Use at least 8 characters.', 'travel-agency-core' );
	}
	if ( ! preg_match( '/[A-Za-z]/', $password ) || ! preg_match( '/\d/', $password ) ) {
		return __( 'Use letters and at least one number.', 'travel-agency-core' );
	}
	$email = strtolower( (string) $email );
	if ( $email && ( strtolower( $password ) === $email || strtolower( $password ) === strstr( $email, '@', true ) ) ) {
		return __( 'Your password cannot be your email address.', 'travel-agency-core' );
	}
	if ( in_array( strtolower( $password ), array( 'password1', 'password123', '12345678a', 'qwerty123', 'azerty123', 'morocco123', 'marrakech1' ), true ) ) {
		return __( 'This password is too common. Choose another one.', 'travel-agency-core' );
	}
	return '';
}

function tac_password_error( $password, $email = '' ) {
	$problem = tac_password_problem( $password, $email );
	return $problem ? new WP_Error( 'weak_password', $problem, array( 'status' => 400 ) ) : null;
}

/* ---------- Sign-in with lockout ---------- */

function tac_lock_key( $login ) {
	return 'tac_fail_' . md5( strtolower( trim( (string) $login ) ) );
}

/**
 * Check an email (or username) and password. After TAC_LOCK_ATTEMPTS wrong passwords the
 * account is locked for TAC_LOCK_SECONDS, whoever tries. The same message is given whether
 * or not the account exists.
 *
 * @return WP_User|WP_Error
 */
function tac_check_credentials( $login, $password ) {
	if ( tac_throttled( 'login', 20 ) ) {
		return new WP_Error( 'too_many_requests', __( 'Too many sign-in attempts. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}
	$key = tac_lock_key( $login );
	if ( (int) get_transient( $key ) >= TAC_LOCK_ATTEMPTS ) {
		return new WP_Error( 'locked', __( 'Too many wrong passwords for this account. Try again in 15 minutes, or reset your password.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}
	$login = trim( (string) $login );
	$found = is_email( $login ) ? get_user_by( 'email', $login ) : get_user_by( 'login', $login );
	$user  = $found ? wp_authenticate( $found->user_login, (string) $password ) : null;
	if ( ! $user || is_wp_error( $user ) ) {
		set_transient( $key, (int) get_transient( $key ) + 1, TAC_LOCK_SECONDS );
		return new WP_Error( 'invalid_login', __( 'Wrong email or password.', 'travel-agency-core' ), array( 'status' => 401 ) );
	}
	delete_transient( $key );
	if ( tac_is_suspended( $user->ID ) ) {
		return new WP_Error( 'suspended', __( 'This account is suspended. Please contact us.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}
	return $user;
}

/* ---------- Password reset in the app ---------- */

/** Email a link to /reset-password on the site (valid 24 hours, single use). */
function tac_send_reset_email( WP_User $user ) {
	$key = get_password_reset_key( $user );
	if ( is_wp_error( $key ) ) {
		return false;
	}
	$link = tac_frontend_url( '/reset-password?login=' . rawurlencode( $user->user_login ) . '&key=' . rawurlencode( $key ) );
	return wp_mail(
		$user->user_email,
		sprintf( '[%s] Reset your password', tac_site_name() ),
		implode(
			"\n",
			array(
				sprintf( 'Hello %s,', $user->display_name ),
				'',
				'Someone asked to reset the password of your account. To choose a new password, open this link (valid for 24 hours):',
				'',
				$link,
				'',
				'If you did not ask for this, ignore this email: your password stays the same.',
				'',
				tac_site_name(),
			)
		)
	);
}

// Requests made on the WordPress login page by suppliers and travellers also get the app link.
add_filter(
	'retrieve_password_message',
	function ( $message, $key, $login, $user ) {
		if ( ! $user instanceof WP_User || tac_is_staff( $user ) ) {
			return $message;
		}
		return sprintf(
			"Hello %s,\n\nTo choose a new password, open this link (valid for 24 hours):\n\n%s\n\nIf you did not ask for this, ignore this email.\n\n%s",
			$user->display_name,
			tac_frontend_url( '/reset-password?login=' . rawurlencode( $login ) . '&key=' . rawurlencode( $key ) ),
			tac_site_name()
		);
	},
	10,
	4
);

/* ---------- No wp-admin for suppliers and travellers ---------- */

/** Where a signed-in supplier or traveller belongs in the app. */
function tac_account_home( WP_User $user ) {
	return tac_frontend_url( tac_is_supplier( $user ) ? '/supplier' : '/account' );
}

/** Suppliers and travellers never see wp-admin: send them to their own dashboard. */
function tac_keep_out_of_admin() {
	if ( wp_doing_ajax() || ! is_user_logged_in() ) {
		return;
	}
	$user = wp_get_current_user();
	if ( ! tac_is_staff( $user ) ) {
		wp_safe_redirect( tac_account_home( $user ) );
		exit;
	}
}
// auth_redirect runs before WordPress builds the admin menu (which would answer 403 first).
add_action( 'auth_redirect', 'tac_keep_out_of_admin', 1 );
add_action( 'admin_init', 'tac_keep_out_of_admin', 1 );

add_filter(
	'show_admin_bar',
	function ( $show ) {
		return $show && is_user_logged_in() && tac_is_staff( wp_get_current_user() );
	}
);

add_filter(
	'login_redirect',
	function ( $redirect, $requested, $user ) {
		return $user instanceof WP_User && ! tac_is_staff( $user ) ? tac_account_home( $user ) : $redirect;
	},
	10,
	3
);

// The app runs on the same site: allow redirects to it.
add_filter(
	'allowed_redirect_hosts',
	function ( $hosts ) {
		$host = wp_parse_url( tac_frontend_url( '/' ), PHP_URL_HOST );
		return $host ? array_merge( $hosts, array( $host ) ) : $hosts;
	}
);

/* ---------- Routes ---------- */

add_action( 'rest_api_init', 'tac_register_account_routes' );

function tac_register_account_routes() {
	$ns = 'travel/v1';

	register_rest_route(
		$ns,
		'/auth/forgot',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => function ( WP_REST_Request $req ) {
				if ( tac_throttled( 'forgot', 5 ) ) {
					return new WP_Error( 'too_many_requests', __( 'Too many requests. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
				}
				$user = get_user_by( 'email', sanitize_email( (string) $req['email'] ) );
				// Staff reset their password on the WordPress login page.
				if ( $user && ! tac_is_staff( $user ) && ! tac_is_suspended( $user->ID ) ) {
					tac_send_reset_email( $user );
				}
				return array( 'status' => 'sent' ); // Same answer whether or not the account exists.
			},
			'permission_callback' => '__return_true',
			'args'                => array( 'email' => array( 'type' => 'string', 'required' => true ) ),
		)
	);

	register_rest_route(
		$ns,
		'/auth/reset',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_reset_password',
			'permission_callback' => '__return_true',
			'args'                => array(
				'login'    => array( 'type' => 'string', 'required' => true ),
				'key'      => array( 'type' => 'string', 'required' => true ),
				'password' => array( 'type' => 'string', 'required' => true, 'maxLength' => 200 ),
			),
		)
	);

	// Sign out everywhere: every token issued so far stops working; this device gets a new one.
	$logout_all = function ( WP_REST_Request $req ) {
		tac_revoke_tokens( $req['_tac_user'] );
		return array( 'token' => tac_issue_token( $req['_tac_user'] ) );
	};
	register_rest_route( $ns, '/me/logout-all', array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => $logout_all, 'permission_callback' => 'tac_require_host' ) );
	register_rest_route( $ns, '/supplier/logout-all', array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => $logout_all, 'permission_callback' => 'tac_require_supplier' ) );

	register_rest_route(
		$ns,
		'/me/password',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_change_password',
			'permission_callback' => 'tac_require_host',
			'args'                => array(
				'current' => array( 'type' => 'string', 'default' => '' ),
				'new'     => array( 'type' => 'string', 'required' => true, 'maxLength' => 200 ),
			),
		)
	);

	register_rest_route(
		$ns,
		'/me/delete',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_delete_traveller',
			'permission_callback' => 'tac_require_host',
			'args'                => array( 'password' => array( 'type' => 'string', 'default' => '' ) ),
		)
	);
}

function tac_rest_reset_password( WP_REST_Request $req ) {
	if ( tac_throttled( 'reset', 10 ) ) {
		return new WP_Error( 'too_many_requests', __( 'Too many requests. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}
	$user = check_password_reset_key( (string) $req['key'], (string) $req['login'] );
	if ( is_wp_error( $user ) ) {
		return new WP_Error( 'invalid_key', __( 'This link has expired or was already used. Ask for a new one.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	if ( tac_is_staff( $user ) ) {
		return new WP_Error( 'invalid_key', __( 'Reset this password on the WordPress login page.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	$weak = tac_password_error( $req['password'], $user->user_email );
	if ( $weak ) {
		return $weak;
	}
	reset_password( $user, (string) $req['password'] ); // Also makes the key unusable.
	tac_revoke_tokens( $user->ID );
	delete_transient( tac_lock_key( $user->user_email ) );
	return array(
		'status'   => 'reset',
		'supplier' => tac_is_supplier( $user ),
	);
}

/** Travellers: change password. Accounts created with Google have no password to give, so "current" is optional for them. */
function tac_rest_change_password( WP_REST_Request $req ) {
	$user       = get_userdata( $req['_tac_user'] );
	$has_google = (bool) get_user_meta( $user->ID, 'tac_google_sub', true );
	if ( ! wp_check_password( (string) $req['current'], $user->user_pass, $user->ID ) && ! ( $has_google && '' === (string) $req['current'] ) ) {
		return new WP_Error( 'wrong_password', __( 'Your current password is not correct.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	$weak = tac_password_error( $req['new'], $user->user_email );
	if ( $weak ) {
		return $weak;
	}
	wp_set_password( (string) $req['new'], $user->ID );
	tac_revoke_tokens( $user->ID );
	return array( 'token' => tac_issue_token( $user->ID ) );
}

/**
 * Travellers can delete their account. Their booking requests stay with the suppliers
 * (they need them), detached from the account.
 */
function tac_rest_delete_traveller( WP_REST_Request $req ) {
	$user = get_userdata( $req['_tac_user'] );
	if ( tac_is_staff( $user ) || tac_is_supplier( $user ) ) {
		return new WP_Error( 'not_allowed', __( 'Supplier and staff accounts are closed by our team. Please contact us.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}
	$has_google = (bool) get_user_meta( $user->ID, 'tac_google_sub', true );
	if ( ! $has_google && ! wp_check_password( (string) $req['password'], $user->user_pass, $user->ID ) ) {
		return new WP_Error( 'wrong_password', __( 'Your password is not correct.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	foreach ( tac_inquiries( array( array( 'key' => 'client_id', 'value' => $user->ID, 'type' => 'NUMERIC' ) ) ) as $inquiry ) {
		update_post_meta( $inquiry->ID, 'client_id', 0 );
	}
	require_once ABSPATH . 'wp-admin/includes/user.php';
	wp_delete_user( $user->ID );
	return array( 'deleted' => true );
}
