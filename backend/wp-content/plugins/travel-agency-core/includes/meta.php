<?php
/**
 * Post meta registered for the REST API.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Editable listing fields: key => [type, label].
 */
function tac_tour_fields() {
	return array(
		'price'          => array( 'number', __( 'Price from', 'travel-agency-core' ) ),
		'currency'       => array( 'string', __( 'Currency (e.g. USD)', 'travel-agency-core' ) ),
		'duration'       => array( 'string', __( 'Duration (e.g. 3 hours)', 'travel-agency-core' ) ),
		'location'       => array( 'string', __( 'Location label', 'travel-agency-core' ) ),
		'destination_id' => array( 'integer', __( 'Destination', 'travel-agency-core' ) ),
		'gallery'        => array( 'string', __( 'Gallery image URLs (one per line)', 'travel-agency-core' ) ),
		'highlights'     => array( 'string', __( 'Highlights (one per line)', 'travel-agency-core' ) ),
		'free_cancel'    => array( 'boolean', __( 'Free cancellation', 'travel-agency-core' ) ),
		'image_url'      => array( 'string', __( 'Image URL (used when no featured image)', 'travel-agency-core' ) ),
	);
}

function tac_destination_fields() {
	return array(
		'country'   => array( 'string', __( 'Country', 'travel-agency-core' ) ),
		'tagline'   => array( 'string', __( 'Tagline', 'travel-agency-core' ) ),
		'image_url' => array( 'string', __( 'Image URL (used when no featured image)', 'travel-agency-core' ) ),
	);
}

add_action( 'init', 'tac_register_meta' );

function tac_register_meta() {
	$groups = array(
		'tour'        => tac_tour_fields(),
		'destination' => tac_destination_fields(),
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
