<?php
/**
 * Load sample destinations, listings and reviews.
 *
 * Usage: docker compose run --rm wpcli wp eval-file /scripts/seed.php
 * Safe to re-run: existing items (matched by slug) are updated, reviews are only added once.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$data = json_decode( file_get_contents( __DIR__ . '/seed-data.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions

$image = function ( $slug ) {
	return 'https://picsum.photos/seed/' . rawurlencode( $slug ) . '/1200/800';
};

$upsert = function ( $post_type, $slug, $postarr ) {
	$existing = get_page_by_path( $slug, OBJECT, $post_type );
	$postarr  = array_merge(
		$postarr,
		array(
			'post_type'   => $post_type,
			'post_name'   => $slug,
			'post_status' => 'publish',
		)
	);
	if ( $existing ) {
		$postarr['ID'] = $existing->ID;
	}
	return wp_insert_post( $postarr, true );
};

foreach ( $data['types'] as $type ) {
	if ( ! term_exists( $type['slug'], 'listing_type' ) ) {
		wp_insert_term( $type['name'], 'listing_type', array( 'slug' => $type['slug'] ) );
	}
}

$destination_ids = array();
foreach ( $data['destinations'] as $i => $d ) {
	$id = $upsert(
		'destination',
		$d['slug'],
		array(
			'post_title'   => $d['name'],
			'post_content' => $d['description'],
			'post_excerpt' => $d['tagline'],
			'menu_order'   => $i,
			'meta_input'   => array(
				'country'   => $d['country'],
				'tagline'   => $d['tagline'],
				'image_url' => $image( $d['slug'] ),
			),
		)
	);
	if ( is_wp_error( $id ) ) {
		WP_CLI::warning( $d['slug'] . ': ' . $id->get_error_message() );
		continue;
	}
	$destination_ids[ $d['slug'] ] = $id;
	WP_CLI::log( "Destination: {$d['name']} (#$id)" );
}

foreach ( $data['listings'] as $l ) {
	$id = $upsert(
		'tour',
		$l['slug'],
		array(
			'post_title'     => $l['title'],
			'post_content'   => $l['description'],
			'post_excerpt'   => $l['excerpt'],
			'comment_status' => 'open',
			'meta_input'     => array(
				'price'          => $l['price'],
				'currency'       => $l['currency'],
				'duration'       => $l['duration'],
				'location'       => $l['location'],
				'free_cancel'    => $l['freeCancel'],
				'destination_id' => $destination_ids[ $l['destination'] ] ?? 0,
				'highlights'     => implode( "\n", $l['highlights'] ),
				'image_url'      => $image( $l['slug'] ),
				'gallery'        => implode( "\n", array( $image( $l['slug'] . '-2' ), $image( $l['slug'] . '-3' ) ) ),
			),
		)
	);
	if ( is_wp_error( $id ) ) {
		WP_CLI::warning( $l['slug'] . ': ' . $id->get_error_message() );
		continue;
	}
	wp_set_object_terms( $id, $l['type'], 'listing_type' );

	if ( ! get_comments( array( 'post_id' => $id, 'count' => true ) ) ) {
		foreach ( $l['reviews'] as $r ) {
			wp_insert_comment(
				array(
					'comment_post_ID'      => $id,
					'comment_author'       => $r['author'],
					'comment_author_email' => sanitize_title( $r['author'] ) . '@example.com',
					'comment_content'      => $r['content'],
					'comment_approved'     => 1,
					'comment_date'         => $r['travelDate'] . '-15 12:00:00',
					'comment_date_gmt'     => $r['travelDate'] . '-15 12:00:00',
					'comment_meta'         => array(
						'rating'      => $r['rating'],
						'title'       => $r['title'],
						'trip_type'   => $r['tripType'],
						'travel_date' => $r['travelDate'],
					),
				)
			);
		}
	}
	tac_recalculate_rating( $id );
	WP_CLI::log( "Listing: {$l['title']} (#$id)" );
}

WP_CLI::success( 'Sample content loaded.' );
