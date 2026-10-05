<?php
/**
 * Traveller profile routes: read and update the signed-in user's name and phone.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', 'tac_register_profile_routes' );

function tac_register_profile_routes() {
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
