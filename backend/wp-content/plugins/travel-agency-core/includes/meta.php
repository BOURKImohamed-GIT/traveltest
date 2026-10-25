<?php
/**
 * Post meta shared outside the listing engine (see listing-schema.php for listing fields).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * How a listing's price is quoted (labels for the price type values in the schema).
 */
function tac_price_units() {
	return array(
		'per_adult'    => __( 'per adult', 'travel-agency-core' ),
		'per_person'   => __( 'per person', 'travel-agency-core' ),
		'per_group'    => __( 'per group', 'travel-agency-core' ),
		'per_vehicle'  => __( 'per vehicle', 'travel-agency-core' ),
		'per_session'  => __( 'per session', 'travel-agency-core' ),
		'custom_quote' => __( 'custom quote', 'travel-agency-core' ),
	);
}

add_action( 'init', 'tac_register_meta' );

function tac_register_meta() {
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
