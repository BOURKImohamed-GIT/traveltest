<?php
/**
 * Post meta registered for the REST API.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Editable tour fields: key => [type, label].
 */
function tac_tour_fields() {
	return array(
		'price'          => array( 'number', __( 'Price from', 'travel-agency-core' ) ),
		'price_unit'     => array( 'string', __( 'Price is', 'travel-agency-core' ) ),
		'currency'       => array( 'string', __( 'Currency (e.g. USD)', 'travel-agency-core' ) ),
		'hide_price'     => array( 'boolean', __( 'Hide price (show "Price on request")', 'travel-agency-core' ) ),
		'duration'       => array( 'string', __( 'Duration (e.g. 6 hours, 3 days)', 'travel-agency-core' ) ),
		'location'       => array( 'string', __( 'Location label', 'travel-agency-core' ) ),
		'group_size'     => array( 'integer', __( 'Max group size', 'travel-agency-core' ) ),
		'languages'      => array( 'string', __( 'Languages (comma separated)', 'travel-agency-core' ) ),
		'tour_style'     => array( 'string', __( 'Tour style (e.g. Private, Shared)', 'travel-agency-core' ) ),
		'start_point'    => array( 'string', __( 'Starts in', 'travel-agency-core' ) ),
		'end_point'      => array( 'string', __( 'Ends in', 'travel-agency-core' ) ),
		'meeting_point'  => array( 'string', __( 'Meeting point / pickup', 'travel-agency-core' ) ),
		'highlights'     => array( 'string', __( 'Highlights (one per line)', 'travel-agency-core' ) ),
		'included'       => array( 'string', __( "What's included (one per line)", 'travel-agency-core' ) ),
		'not_included'   => array( 'string', __( 'Not included (one per line)', 'travel-agency-core' ) ),
		'notes'          => array( 'string', __( 'Important notes (one per line)', 'travel-agency-core' ) ),
		'amenities'      => array( 'string', __( 'Amenities (one per line, for stays and restaurants)', 'travel-agency-core' ) ),
		'free_cancel'    => array( 'boolean', __( 'Free cancellation', 'travel-agency-core' ) ),
	);
}

/**
 * How a listing's price is quoted.
 */
function tac_price_units() {
	return array(
		'per_adult'  => __( 'per adult', 'travel-agency-core' ),
		'per_person' => __( 'per person', 'travel-agency-core' ),
		'per_night'  => __( 'per night', 'travel-agency-core' ),
		'per_group'  => __( 'per group', 'travel-agency-core' ),
	);
}

function tac_multiline_fields() {
	return array( 'highlights', 'included', 'not_included', 'notes', 'amenities' );
}

/**
 * Clean one submitted field value by its declared type.
 */
function tac_sanitize_field( $key, $type, $raw ) {
	switch ( $type ) {
		case 'boolean':
			return ! empty( $raw ) && 'false' !== $raw;
		case 'integer':
			return absint( $raw );
		case 'number':
			return is_numeric( $raw ) ? max( 0, (float) $raw ) : 0;
	}
	$raw = is_scalar( $raw ) ? (string) $raw : '';
	if ( 'image_url' === $key ) {
		return esc_url_raw( $raw );
	}
	if ( 'price_unit' === $key ) {
		return array_key_exists( $raw, tac_price_units() ) ? $raw : 'per_adult';
	}
	if ( 'currency' === $key ) {
		$raw = strtoupper( preg_replace( '/[^A-Za-z]/', '', $raw ) );
		return in_array( $raw, array( 'EUR', 'USD', 'MAD', 'GBP' ), true ) ? $raw : 'EUR';
	}
	if ( in_array( $key, tac_multiline_fields(), true ) ) {
		return sanitize_textarea_field( $raw );
	}
	return sanitize_text_field( $raw );
}

add_action( 'init', 'tac_register_meta' );

function tac_register_meta() {
	$groups = array(
		'tour' => tac_tour_fields(),
	);

	foreach ( $groups as $post_type => $fields ) {
		foreach ( $fields as $key => $def ) {
			register_post_meta(
				$post_type,
				$key,
				array(
					'type'          => $def[0],
					'single'        => true,
					'show_in_rest'  => true,
					'auth_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}

	// Aggregates maintained from approved reviews; read-only over REST.
	foreach ( array( 'rating' => 'number', 'review_count' => 'integer' ) as $key => $type ) {
		register_post_meta(
			'tour',
			$key,
			array(
				'type'          => $type,
				'single'        => true,
				'default'       => 0,
				'show_in_rest'  => true,
				'auth_callback' => '__return_false',
			)
		);
	}
}
