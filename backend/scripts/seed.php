<?php
/**
 * Load sample destinations, tours and reviews.
 *
 * Usage: docker compose run --rm wpcli wp eval-file /scripts/seed.php
 * Safe to re-run: existing items (matched by slug) are updated, reviews are only added once.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$data = json_decode( file_get_contents( __DIR__ . '/seed-data.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions

// Listings without their own photos get placeholders. Paths like /images/x.jpg are served by the frontend.
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

// Parents are listed before their children in seed-data.json.
foreach ( $data['categories'] as $cat ) {
	$parent = 0;
	if ( ! empty( $cat['parent'] ) ) {
		$parent_term = get_term_by( 'slug', $cat['parent'], 'tour_category' );
		$parent      = $parent_term ? (int) $parent_term->term_id : 0;
	}
	if ( ! term_exists( $cat['slug'], 'tour_category' ) ) {
		wp_insert_term( $cat['name'], 'tour_category', array( 'slug' => $cat['slug'], 'parent' => $parent ) );
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
				'image_url' => $d['image'] ?? $image( $d['slug'] ),
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

foreach ( $data['tours'] as $l ) {
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
				'price_unit'     => $l['priceUnit'] ?? 'per_adult',
				'amenities'      => implode( "\n", $l['amenities'] ?? array() ),
				'duration'       => $l['duration'],
				'location'       => $l['location'],
				'free_cancel'    => $l['freeCancel'],
				'destination_id' => $destination_ids[ $l['destination'] ] ?? 0,
				'group_size'     => $l['groupSize'],
				'languages'      => $l['languages'],
				'tour_style'     => $l['tourStyle'] ?? '',
				'start_point'    => $l['startPoint'] ?? '',
				'end_point'      => $l['endPoint'] ?? '',
				'notes'          => implode( "\n", $l['notes'] ?? array() ),
				'meeting_point'  => $l['meetingPoint'],
				'highlights'     => implode( "\n", $l['highlights'] ),
				'itinerary'      => implode(
					"\n",
					array_map(
						function ( $stop ) {
							return rtrim( $stop['title'] . ' | ' . $stop['details'] . ' | ' . ( $stop['distance'] ?? '' ), ' |' );
						},
						$l['itinerary']
					)
				),
				'included'       => implode( "\n", $l['included'] ),
				'not_included'   => implode( "\n", $l['notIncluded'] ),
				'image_url'      => $l['image'] ?? $image( $l['slug'] ),
				'gallery'        => implode( "\n", $l['gallery'] ? array_slice( $l['gallery'], 1 ) : array( $image( $l['slug'] . '-2' ), $image( $l['slug'] . '-3' ) ) ),
			),
		)
	);
	if ( is_wp_error( $id ) ) {
		WP_CLI::warning( $l['slug'] . ': ' . $id->get_error_message() );
		continue;
	}
	wp_set_object_terms( $id, $l['category'], 'tour_category' );

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
	WP_CLI::log( "Tour: {$l['title']} (#$id)" );
}

// Site pages (About Us, FAQs, policies…). Published pages are left alone so edits made in wp-admin are kept.
foreach ( $data['pages'] ?? array() as $page ) {
	$existing = get_page_by_path( $page['slug'], OBJECT, 'page' );
	if ( $existing && 'publish' === $existing->post_status ) {
		WP_CLI::log( "Page exists, skipped: {$page['title']}" );
		continue;
	}
	// WordPress creates an unpublished "Privacy Policy" draft on install: fill and publish it.
	$id = wp_insert_post(
		array(
			'ID'           => $existing ? $existing->ID : 0,
			'post_type'    => 'page',
			'post_name'    => $page['slug'],
			'post_title'   => $page['title'],
			'post_content' => $page['content'],
			'post_status'  => 'publish',
		),
		true
	);
	WP_CLI::log( is_wp_error( $id ) ? "Page failed: {$page['title']}" : "Page: {$page['title']} (#$id)" );
}

WP_CLI::success( 'Sample content loaded.' );
