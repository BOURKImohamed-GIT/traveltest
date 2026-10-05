<?php
/**
 * travel/v1 REST routes consumed by the React frontend.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', 'tac_register_routes' );

function tac_register_routes() {
	$ns = 'travel/v1';

	register_rest_route(
		$ns,
		'/tours',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'tac_rest_list_tours',
			'permission_callback' => '__return_true',
			'args'                => array(
				'search'      => array( 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
				'category'    => array( 'type' => 'string', 'sanitize_callback' => 'sanitize_title' ),
				'destination' => array( 'type' => 'string', 'sanitize_callback' => 'sanitize_title' ),
				'min_price'   => array( 'type' => 'number' ),
				'max_price'   => array( 'type' => 'number' ),
				'min_rating'  => array( 'type' => 'number' ),
				'sort'        => array(
					'type'    => 'string',
					'enum'    => array( 'recommended', 'rating', 'price_asc', 'price_desc' ),
					'default' => 'recommended',
				),
				'page'        => array( 'type' => 'integer', 'default' => 1, 'minimum' => 1 ),
				'per_page'    => array( 'type' => 'integer', 'default' => 12, 'minimum' => 1, 'maximum' => 50 ),
			),
		)
	);

	register_rest_route(
		$ns,
		'/tours/(?P<slug>[a-z0-9-]+)',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'tac_rest_get_tour',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		$ns,
		'/tours/(?P<id>\d+)/reviews',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'tac_rest_list_reviews',
				'permission_callback' => '__return_true',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'tac_rest_create_review',
				'permission_callback' => '__return_true',
				'args'                => array(
					'author'     => array( 'type' => 'string', 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
					'email'      => array( 'type' => 'string', 'required' => true, 'format' => 'email' ),
					'rating'     => array( 'type' => 'integer', 'required' => true, 'minimum' => 1, 'maximum' => 5 ),
					'title'      => array( 'type' => 'string', 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
					'content'    => array( 'type' => 'string', 'required' => true, 'sanitize_callback' => 'sanitize_textarea_field' ),
					'tripType'   => array( 'type' => 'string', 'enum' => array( '', 'business', 'couples', 'family', 'friends', 'solo' ), 'default' => '' ),
					'travelDate' => array( 'type' => 'string', 'pattern' => '^(\d{4}-\d{2})?$', 'default' => '' ),
					'website'    => array( 'type' => 'string', 'default' => '' ), // Honeypot.
				),
			),
		)
	);

	register_rest_route(
		$ns,
		'/destinations',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'tac_rest_list_destinations',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		$ns,
		'/destinations/(?P<slug>[a-z0-9-]+)',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'tac_rest_get_destination',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		$ns,
		'/tour-categories',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'tac_rest_list_categories',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		$ns,
		'/inquiries',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_create_inquiry',
			'permission_callback' => '__return_true',
			'args'                => array(
				'tourId'  => array( 'type' => 'integer', 'required' => true ),
				'name'    => array( 'type' => 'string', 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
				'email'   => array( 'type' => 'string', 'required' => true, 'format' => 'email' ),
				'phone'   => array( 'type' => 'string', 'default' => '', 'sanitize_callback' => 'sanitize_text_field' ),
				'date'    => array( 'type' => 'string', 'required' => true, 'validate_callback' => 'tac_validate_future_date' ),
				'guests'  => array( 'type' => 'integer', 'required' => true, 'minimum' => 1, 'maximum' => 50 ),
				'message' => array( 'type' => 'string', 'default' => '', 'sanitize_callback' => 'sanitize_textarea_field' ),
				'website' => array( 'type' => 'string', 'default' => '' ), // Honeypot.
			),
		)
	);
}

/**
 * Accept a YYYY-MM-DD calendar date that is today or later (site timezone).
 */
function tac_validate_future_date( $value ) {
	$date = DateTimeImmutable::createFromFormat( '!Y-m-d', (string) $value, wp_timezone() );
	if ( ! $date || $date->format( 'Y-m-d' ) !== $value ) {
		return new WP_Error( 'rest_invalid_param', __( 'Date must be in YYYY-MM-DD format.', 'travel-agency-core' ) );
	}
	if ( $date < new DateTimeImmutable( 'today', wp_timezone() ) ) {
		return new WP_Error( 'rest_invalid_param', __( 'Date cannot be in the past.', 'travel-agency-core' ) );
	}
	return true;
}

/* ---------- Formatting ---------- */

function tac_image_url( $post_id, $size = 'large' ) {
	$url = get_the_post_thumbnail_url( $post_id, $size );
	if ( ! $url ) {
		$url = esc_url_raw( (string) get_post_meta( $post_id, 'image_url', true ) );
	}
	return $url ? $url : null;
}

function tac_text( $value ) {
	return html_entity_decode( wp_strip_all_tags( (string) $value ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
}

function tac_lines( $value ) {
	return array_values( array_filter( array_map( 'trim', preg_split( '/\r\n|\r|\n/', (string) $value ) ) ) );
}

function tac_format_destination( WP_Post $post, $full = false ) {
	$data = array(
		'id'        => $post->ID,
		'slug'      => $post->post_name,
		'name'      => tac_text( get_the_title( $post ) ),
		'country'   => (string) get_post_meta( $post->ID, 'country', true ),
		'tagline'   => (string) get_post_meta( $post->ID, 'tagline', true ),
		'image'     => tac_image_url( $post->ID ),
		'tourCount' => tac_count_tours_in_destination( $post->ID ),
	);
	if ( $full ) {
		$data['description'] = apply_filters( 'the_content', $post->post_content );
	}
	return $data;
}

function tac_count_tours_in_destination( $destination_id ) {
	$q = new WP_Query(
		array(
			'post_type'      => 'tour',
			'post_status'    => 'publish',
			'author__not_in' => tac_suspended_user_ids(),
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_key'       => 'destination_id', // phpcs:ignore WordPress.DB.SlowDBQuery
			'meta_value'     => $destination_id, // phpcs:ignore WordPress.DB.SlowDBQuery
		)
	);
	return (int) $q->found_posts;
}

/**
 * The business behind a listing, or null for listings the site team manages.
 */
function tac_listing_host( WP_Post $post ) {
	$author = get_userdata( (int) $post->post_author );
	if ( ! $author || user_can( $author, 'edit_others_posts' ) ) {
		return null;
	}
	return array( 'name' => $author->display_name );
}

function tac_format_tour( WP_Post $post, $full = false ) {
	$terms          = get_the_terms( $post, 'tour_category' );
	$category       = $terms && ! is_wp_error( $terms ) ? $terms[0] : null;
	$destination_id = (int) get_post_meta( $post->ID, 'destination_id', true );
	$destination    = $destination_id ? get_post( $destination_id ) : null;

	$data = array(
		'id'           => $post->ID,
		'slug'         => $post->post_name,
		'title'        => tac_text( get_the_title( $post ) ),
		'excerpt'      => tac_text( get_the_excerpt( $post ) ),
		'image'        => tac_image_url( $post->ID ),
		'price'        => (float) get_post_meta( $post->ID, 'price', true ),
		'currency'     => get_post_meta( $post->ID, 'currency', true ) ?: 'EUR',
		'priceUnit'    => get_post_meta( $post->ID, 'price_unit', true ) ?: 'per_adult',
		'duration'     => (string) get_post_meta( $post->ID, 'duration', true ),
		'location'     => (string) get_post_meta( $post->ID, 'location', true ),
		'rating'       => (float) get_post_meta( $post->ID, 'rating', true ),
		'reviewCount'  => (int) get_post_meta( $post->ID, 'review_count', true ),
		'freeCancel'   => (bool) get_post_meta( $post->ID, 'free_cancel', true ),
		'groupSize'    => (int) get_post_meta( $post->ID, 'group_size', true ),
		'category'     => $category ? array( 'slug' => $category->slug, 'name' => tac_text( $category->name ) ) : null,
		'destination'  => $destination && 'publish' === $destination->post_status
			? array( 'id' => $destination->ID, 'slug' => $destination->post_name, 'name' => tac_text( get_the_title( $destination ) ) )
			: null,
		'host'         => tac_listing_host( $post ),
	);

	if ( $full ) {
		$gallery             = tac_lines( get_post_meta( $post->ID, 'gallery', true ) );
		$data['description'] = apply_filters( 'the_content', $post->post_content );
		$data['highlights']   = tac_lines( get_post_meta( $post->ID, 'highlights', true ) );
		$data['amenities']    = tac_lines( get_post_meta( $post->ID, 'amenities', true ) );
		$data['included']     = tac_lines( get_post_meta( $post->ID, 'included', true ) );
		$data['notIncluded']  = tac_lines( get_post_meta( $post->ID, 'not_included', true ) );
		$data['meetingPoint'] = (string) get_post_meta( $post->ID, 'meeting_point', true );
		$data['languages']    = array_values( array_filter( array_map( 'trim', explode( ',', (string) get_post_meta( $post->ID, 'languages', true ) ) ) ) );
		$data['itinerary']    = array_map(
			function ( $line ) {
				$parts = array_map( 'trim', explode( '|', $line, 2 ) );
				return array( 'title' => $parts[0], 'details' => $parts[1] ?? '' );
			},
			tac_lines( get_post_meta( $post->ID, 'itinerary', true ) )
		);
		$data['gallery']     = array_values( array_filter( array_merge( array( $data['image'] ), array_map( 'esc_url_raw', $gallery ) ) ) );
	}

	return $data;
}

/* ---------- Handlers ---------- */

function tac_rest_list_tours( WP_REST_Request $req ) {
	$args = array(
		'post_type'      => 'tour',
		'post_status'    => 'publish',
		'author__not_in' => tac_suspended_user_ids(),
		'posts_per_page' => $req['per_page'],
		'paged'          => $req['page'],
		'meta_query'     => array( 'relation' => 'AND' ), // phpcs:ignore WordPress.DB.SlowDBQuery
	);

	if ( $req['search'] ) {
		$args['s'] = $req['search'];
	}
	if ( $req['category'] ) {
		$args['tax_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery
			array(
				'taxonomy' => 'tour_category',
				'field'    => 'slug',
				'terms'    => $req['category'],
			),
		);
	}
	if ( $req['destination'] ) {
		$dest = get_page_by_path( $req['destination'], OBJECT, 'destination' );
		if ( ! $dest ) {
			return tac_paged_response( array(), 0, 0 );
		}
		$args['meta_query'][] = array( 'key' => 'destination_id', 'value' => $dest->ID, 'type' => 'NUMERIC' );
	}
	if ( null !== $req['min_price'] ) {
		$args['meta_query'][] = array( 'key' => 'price', 'value' => (float) $req['min_price'], 'compare' => '>=', 'type' => 'DECIMAL(10,2)' );
	}
	if ( null !== $req['max_price'] ) {
		$args['meta_query'][] = array( 'key' => 'price', 'value' => (float) $req['max_price'], 'compare' => '<=', 'type' => 'DECIMAL(10,2)' );
	}
	if ( null !== $req['min_rating'] ) {
		$args['meta_query'][] = array( 'key' => 'rating', 'value' => (float) $req['min_rating'], 'compare' => '>=', 'type' => 'DECIMAL(3,1)' );
	}

	switch ( $req['sort'] ) {
		case 'rating':
			$args['meta_query']['rating_clause'] = array( 'key' => 'rating', 'type' => 'DECIMAL(3,1)' );
			$args['orderby']                     = array( 'rating_clause' => 'DESC', 'date' => 'DESC' );
			break;
		case 'price_asc':
		case 'price_desc':
			$args['meta_query']['price_clause'] = array( 'key' => 'price', 'type' => 'DECIMAL(10,2)' );
			$args['orderby']                    = array( 'price_clause' => 'price_asc' === $req['sort'] ? 'ASC' : 'DESC' );
			break;
		default:
			// "Recommended": most-reviewed first.
			$args['meta_query']['count_clause'] = array( 'key' => 'review_count', 'type' => 'NUMERIC' );
			$args['orderby']                    = array( 'count_clause' => 'DESC', 'date' => 'DESC' );
	}

	$query = new WP_Query( $args );
	$items = array_map( 'tac_format_tour', $query->posts );

	return tac_paged_response( $items, (int) $query->found_posts, (int) $query->max_num_pages );
}

function tac_paged_response( $items, $total, $pages ) {
	$response = rest_ensure_response( array( 'items' => $items, 'total' => $total, 'totalPages' => $pages ) );
	return $response;
}

function tac_rest_get_tour( WP_REST_Request $req ) {
	$post = get_page_by_path( $req['slug'], OBJECT, 'tour' );
	if ( ! $post || 'publish' !== $post->post_status || tac_is_suspended( $post->post_author ) ) {
		return new WP_Error( 'not_found', __( 'Tour not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
	}
	return rest_ensure_response( tac_format_tour( $post, true ) );
}

function tac_rest_list_destinations() {
	$posts = get_posts(
		array(
			'post_type'   => 'destination',
			'post_status' => 'publish',
			'numberposts' => 50,
			'orderby'     => 'menu_order title',
			'order'       => 'ASC',
		)
	);
	return rest_ensure_response( array_map( 'tac_format_destination', $posts ) );
}

function tac_rest_get_destination( WP_REST_Request $req ) {
	$post = get_page_by_path( $req['slug'], OBJECT, 'destination' );
	if ( ! $post || 'publish' !== $post->post_status ) {
		return new WP_Error( 'not_found', __( 'Destination not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
	}
	return rest_ensure_response( tac_format_destination( $post, true ) );
}

function tac_rest_list_categories() {
	$terms = get_terms( array( 'taxonomy' => 'tour_category', 'hide_empty' => false, 'orderby' => 'term_id' ) );
	if ( is_wp_error( $terms ) ) {
		return $terms;
	}
	$slugs = wp_list_pluck( $terms, 'slug', 'term_id' );
	return rest_ensure_response(
		array_map(
			function ( $t ) use ( $slugs ) {
				return array(
					'slug'   => $t->slug,
					'name'   => tac_text( $t->name ),
					'parent' => $t->parent ? ( $slugs[ $t->parent ] ?? null ) : null,
					'count'  => (int) $t->count,
				);
			},
			$terms
		)
	);
}

function tac_published_tour_or_error( $id ) {
	$post = get_post( (int) $id );
	if ( ! $post || 'tour' !== $post->post_type || 'publish' !== $post->post_status || tac_is_suspended( $post->post_author ) ) {
		return new WP_Error( 'not_found', __( 'Tour not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
	}
	return $post;
}

function tac_rest_list_reviews( WP_REST_Request $req ) {
	$post = tac_published_tour_or_error( $req['id'] );
	if ( is_wp_error( $post ) ) {
		return $post;
	}
	$comments = get_comments(
		array(
			'post_id' => $post->ID,
			'status'  => 'approve',
			'orderby' => 'comment_date_gmt',
			'order'   => 'DESC',
			'number'  => 50,
		)
	);
	return rest_ensure_response( array_map( 'tac_format_review', $comments ) );
}

/**
 * Simple per-IP throttle for public write endpoints.
 */
function tac_throttled( $bucket, $limit = 5, $window = HOUR_IN_SECONDS ) {
	$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
	$key = 'tac_' . $bucket . '_' . md5( $ip );
	$hit = (int) get_transient( $key );
	if ( $hit >= $limit ) {
		return true;
	}
	set_transient( $key, $hit + 1, $window );
	return false;
}

function tac_rest_create_review( WP_REST_Request $req ) {
	$post = tac_published_tour_or_error( $req['id'] );
	if ( is_wp_error( $post ) ) {
		return $post;
	}
	if ( '' !== $req['website'] ) {
		// Honeypot filled in: pretend success, store nothing.
		return new WP_REST_Response( array( 'status' => 'pending' ), 202 );
	}
	if ( tac_throttled( 'review' ) ) {
		return new WP_Error( 'too_many_requests', __( 'Too many reviews from this address. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}

	$comment_id = wp_insert_comment(
		array(
			'comment_post_ID'      => $post->ID,
			'comment_author'       => $req['author'],
			'comment_author_email' => sanitize_email( $req['email'] ),
			'comment_content'      => $req['content'],
			'comment_approved'     => 0,
			'comment_type'         => 'comment',
			'comment_author_IP'    => isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '',
			'comment_meta'         => array(
				'rating'      => (int) $req['rating'],
				'title'       => $req['title'],
				'trip_type'   => $req['tripType'],
				'travel_date' => $req['travelDate'],
			),
		)
	);

	if ( ! $comment_id ) {
		return new WP_Error( 'review_failed', __( 'Could not save the review.', 'travel-agency-core' ), array( 'status' => 500 ) );
	}

	return new WP_REST_Response( array( 'status' => 'pending' ), 202 );
}

function tac_rest_create_inquiry( WP_REST_Request $req ) {
	$tour = tac_published_tour_or_error( $req['tourId'] );
	if ( is_wp_error( $tour ) ) {
		return $tour;
	}
	if ( '' !== $req['website'] ) {
		return new WP_REST_Response( array( 'status' => 'received' ), 201 );
	}
	if ( tac_throttled( 'inquiry', 10 ) ) {
		return new WP_Error( 'too_many_requests', __( 'Too many requests from this address. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}

	$email      = sanitize_email( $req['email'] );
	$tour_title = $tour->post_title;
	$client     = tac_user_from_request( $req ); // Optional: signed-in clients see the request in their dashboard.
	$owner_id   = tac_listing_owner_id( $tour );
	$lines      = array(
		sprintf( 'Listing: %s', $tour_title ),
		sprintf( 'Name: %s', $req['name'] ),
		sprintf( 'Email: %s', $email ),
		sprintf( 'Phone: %s', $req['phone'] ),
		sprintf( 'Date: %s', $req['date'] ),
		sprintf( 'Guests: %d', $req['guests'] ),
		'',
		$req['message'],
	);
	$body = implode( "\n", $lines );

	$inquiry_id = wp_insert_post(
		array(
			'post_type'    => 'inquiry',
			'post_status'  => 'private',
			'post_title'   => sprintf( '%s — %s (%s)', $req['name'], $tour_title, $req['date'] ),
			'post_content' => $body,
			'meta_input'   => array(
				'tour_id'   => $tour->ID,
				'owner_id'  => $owner_id,
				'client_id' => $client ? $client->ID : 0,
				'name'      => $req['name'],
				'email'     => $email,
				'phone'     => $req['phone'],
				'guests'    => (int) $req['guests'],
				'date'      => $req['date'],
				'message'   => $req['message'],
				'status'    => 'requested',
			),
		),
		true
	);

	if ( is_wp_error( $inquiry_id ) ) {
		return new WP_Error( 'inquiry_failed', __( 'Could not save the inquiry.', 'travel-agency-core' ), array( 'status' => 500 ) );
	}

	// The request goes to whoever published the listing: the business, or the site team for its own listings.
	wp_mail(
		tac_inquiry_recipient( $owner_id ),
		sprintf( '[%s] New booking request: %s', wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ), $tour_title ),
		$body . "\n\n" . sprintf( 'Reply by email, or confirm or decline it in your dashboard: %s', tac_frontend_url( '/account/requests' ) ),
		array( 'Reply-To: ' . $req['name'] . ' <' . $email . '>' )
	);

	return new WP_REST_Response( array( 'status' => 'received', 'id' => $inquiry_id ), 201 );
}
