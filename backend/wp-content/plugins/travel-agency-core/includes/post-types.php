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
		'tour',
		array(
			'labels'       => array(
				'name'          => __( 'All listings', 'travel-agency-core' ),
				'singular_name' => __( 'Listing', 'travel-agency-core' ),
				'all_items'     => __( 'All listings', 'travel-agency-core' ),
				'edit_item'     => __( 'Review listing', 'travel-agency-core' ),
			),
			'public'       => true,
			// The platform does not list tours: businesses create listings from their dashboard,
			// the team reviews them under Marketplace.
			'show_in_menu' => 'tac-marketplace',
			'capability_type' => 'post',
			'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
			'map_meta_cap'    => true,
			'has_archive'  => true,
			'menu_icon'    => 'dashicons-palmtree',
			'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'comments', 'author' ),
			'show_in_rest' => true,
			'rest_base'    => 'tours',
		)
	);

	register_taxonomy(
		'tour_category',
		'tour',
		array(
			'labels'            => array(
				'name'          => __( 'Listing categories', 'travel-agency-core' ),
				'singular_name' => __( 'Listing category', 'travel-agency-core' ),
			),
			'hierarchical'      => true,
			'show_in_rest'      => true,
			'rest_base'         => 'tour-categories',
			'show_admin_column' => true,
		)
	);

	// Booking inquiries are private: visible in wp-admin only.
	register_post_type(
		'inquiry',
		array(
			'labels'          => array(
				'name'          => __( 'Booking activity', 'travel-agency-core' ),
				'singular_name' => __( 'Booking request', 'travel-agency-core' ),
				'all_items'     => __( 'Booking activity', 'travel-agency-core' ),
				'edit_item'     => __( 'Booking request', 'travel-agency-core' ),
			),
			'public'          => false,
			'show_ui'         => true,
			// Read-only overview: each business answers its own requests.
			'show_in_menu'    => 'tac-marketplace',
			'menu_icon'       => 'dashicons-email-alt',
			'supports'        => array( 'title', 'editor' ),
			'capability_type' => 'post',
			'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
			'map_meta_cap'    => true,
			'show_in_rest'    => false,
		)
	);
}
