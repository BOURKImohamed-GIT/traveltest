<?php
/**
 * Custom post types and taxonomies.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', 'tac_register_post_types' );

function tac_register_post_types() {
	register_post_type(
		'destination',
		array(
			'labels'       => array(
				'name'          => __( 'Destinations', 'travel-agency-core' ),
				'singular_name' => __( 'Destination', 'travel-agency-core' ),
			),
			'public'       => true,
			'has_archive'  => true,
			'menu_icon'    => 'dashicons-location-alt',
			'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail' ),
			'show_in_rest' => true,
			'rest_base'    => 'destinations',
		)
	);

	register_post_type(
		'tour',
		array(
			'labels'       => array(
				'name'          => __( 'Listings', 'travel-agency-core' ),
				'singular_name' => __( 'Listing', 'travel-agency-core' ),
				'add_new_item'  => __( 'Add listing (tour, hotel, activity…)', 'travel-agency-core' ),
			),
			'public'       => true,
			'has_archive'  => true,
			'menu_icon'    => 'dashicons-palmtree',
			'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'comments' ),
			'show_in_rest' => true,
			'rest_base'    => 'tours',
		)
	);

	register_taxonomy(
		'listing_type',
		'tour',
		array(
			'labels'            => array(
				'name'          => __( 'Listing types', 'travel-agency-core' ),
				'singular_name' => __( 'Listing type', 'travel-agency-core' ),
			),
			'hierarchical'      => true,
			'show_in_rest'      => true,
			'rest_base'         => 'listing-types',
			'show_admin_column' => true,
		)
	);

	// Booking inquiries are private: visible in wp-admin only.
	register_post_type(
		'inquiry',
		array(
			'labels'          => array(
				'name'          => __( 'Inquiries', 'travel-agency-core' ),
				'singular_name' => __( 'Inquiry', 'travel-agency-core' ),
			),
			'public'          => false,
			'show_ui'         => true,
			'menu_icon'       => 'dashicons-email-alt',
			'supports'        => array( 'title', 'editor' ),
			'capability_type' => 'post',
			'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
			'map_meta_cap'    => true,
			'show_in_rest'    => false,
		)
	);
}
