<?php
/**
 * Allow the React app's origin to call the REST API from the browser.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'rest_api_init',
	function () {
		remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
		add_filter(
			'rest_pre_serve_request',
			function ( $value ) {
				$allowed = array_map( 'trim', explode( ',', defined( 'TRAVEL_FRONTEND_ORIGIN' ) ? TRAVEL_FRONTEND_ORIGIN : 'http://localhost:5173' ) );
				$origin  = get_http_origin();
				if ( $origin && in_array( $origin, $allowed, true ) ) {
					header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
					header( 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS' );
					header( 'Access-Control-Allow-Headers: Content-Type, Authorization' );
					header( 'Vary: Origin' );
				}
				return $value;
			}
		);
	},
	15
);
