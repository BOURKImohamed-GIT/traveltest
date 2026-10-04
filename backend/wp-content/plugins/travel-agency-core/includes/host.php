<?php
/**
 * Routes for signed-in listing owners: manage their own listings and photos.
 *
 * Every new or edited listing goes to "pending" until a site admin publishes it
 * in wp-admin (Listings → Pending).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_MAX_LISTINGS_PER_HOST = 50;
const TAC_MAX_UPLOAD_BYTES      = 8 * MB_IN_BYTES;

add_action( 'rest_api_init', 'tac_register_host_routes' );

function tac_listing_args() {
	$text = array( 'type' => 'string', 'default' => '' );
	return array(
		'title'        => array( 'type' => 'string', 'required' => true, 'minLength' => 5, 'maxLength' => 120 ),
		'category'     => array( 'type' => 'string', 'required' => true ),
		'destination'  => $text,
		'price'        => array( 'type' => 'number', 'required' => true, 'minimum' => 0, 'maximum' => 100000 ),
		'currency'     => array( 'type' => 'string', 'enum' => array( 'EUR', 'USD', 'MAD', 'GBP' ), 'default' => 'EUR' ),
		'priceUnit'    => array( 'type' => 'string', 'enum' => array_keys( tac_price_units() ), 'default' => 'per_person' ),
		'duration'     => $text,
		'location'     => array( 'type' => 'string', 'required' => true, 'minLength' => 2, 'maxLength' => 120 ),
		'excerpt'      => array( 'type' => 'string', 'required' => true, 'minLength' => 20, 'maxLength' => 300 ),
		'description'  => array( 'type' => 'string', 'required' => true, 'minLength' => 50, 'maxLength' => 8000 ),
		'highlights'   => array( 'type' => 'array', 'items' => array( 'type' => 'string' ), 'default' => array(), 'maxItems' => 12 ),
		'included'     => array( 'type' => 'array', 'items' => array( 'type' => 'string' ), 'default' => array(), 'maxItems' => 20 ),
		'notIncluded'  => array( 'type' => 'array', 'items' => array( 'type' => 'string' ), 'default' => array(), 'maxItems' => 20 ),
		'amenities'    => array( 'type' => 'array', 'items' => array( 'type' => 'string' ), 'default' => array(), 'maxItems' => 30 ),
		'itinerary'    => array(
			'type'     => 'array',
			'default'  => array(),
			'maxItems' => 30,
			'items'    => array(
				'type'       => 'object',
				'properties' => array(
					'title'   => array( 'type' => 'string' ),
					'details' => array( 'type' => 'string' ),
				),
			),
		),
		'meetingPoint' => $text,
		'languages'    => $text,
		'groupSize'    => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 500, 'default' => 0 ),
		'freeCancel'   => array( 'type' => 'boolean', 'default' => false ),
		'imageIds'     => array( 'type' => 'array', 'items' => array( 'type' => 'integer' ), 'default' => array(), 'maxItems' => 10 ),
	);
}

function tac_register_host_routes() {
	$ns = 'travel/v1';

	register_rest_route(
		$ns,
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
					'name'        => array( 'type' => 'string', 'minLength' => 2, 'maxLength' => 80, 'sanitize_callback' => 'sanitize_text_field' ),
					'phone'       => array( 'type' => 'string', 'maxLength' => 30, 'sanitize_callback' => 'sanitize_text_field' ),
					'accountType' => array( 'type' => 'string', 'enum' => array( 'client', 'supplier' ) ),
				),
			),
		)
	);

	register_rest_route(
		$ns,
		'/me/listings',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'tac_rest_my_listings',
				'permission_callback' => 'tac_require_host',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'tac_rest_create_listing',
				'permission_callback' => 'tac_require_host',
				'args'                => tac_listing_args(),
			),
		)
	);

	register_rest_route(
		$ns,
		'/me/listings/(?P<id>\d+)',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'tac_rest_my_listing',
				'permission_callback' => 'tac_require_host',
			),
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => 'tac_rest_update_listing',
				'permission_callback' => 'tac_require_host',
				'args'                => tac_listing_args(),
			),
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => 'tac_rest_delete_listing',
				'permission_callback' => 'tac_require_host',
			),
		)
	);

	register_rest_route(
		$ns,
		'/me/uploads',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_upload',
			'permission_callback' => 'tac_require_host',
		)
	);
}

/**
 * A listing the signed-in user owns, or WP_Error (404 so other people's ids aren't revealed).
 */
function tac_owned_listing( WP_REST_Request $req ) {
	$post = get_post( (int) $req['id'] );
	if ( ! $post || 'tour' !== $post->post_type || 'trash' === $post->post_status || (int) $post->post_author !== (int) $req['_tac_user'] ) {
		return new WP_Error( 'not_found', __( 'Listing not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
	}
	return $post;
}

/**
 * Owner view: the public fields plus status and the raw values the edit form needs.
 */
function tac_format_owned( WP_Post $post ) {
	$data       = tac_format_tour( $post, true );
	$terms      = get_the_terms( $post, 'tour_category' );
	$dest_id    = (int) get_post_meta( $post->ID, 'destination_id', true );
	$gallery_id = array_map( 'intval', (array) get_post_meta( $post->ID, 'tac_gallery_ids', true ) );
	$images     = array_values( array_filter( array_merge( array( (int) get_post_thumbnail_id( $post ) ), $gallery_id ) ) );

	$data['status'] = $post->post_status;
	$data['raw']    = array(
		'title'        => $post->post_title,
		'category'     => $terms && ! is_wp_error( $terms ) ? $terms[0]->slug : '',
		'destination'  => $dest_id ? get_post_field( 'post_name', $dest_id ) : '',
		'price'        => (float) get_post_meta( $post->ID, 'price', true ),
		'currency'     => get_post_meta( $post->ID, 'currency', true ) ?: 'EUR',
		'priceUnit'    => get_post_meta( $post->ID, 'price_unit', true ) ?: 'per_person',
		'duration'     => (string) get_post_meta( $post->ID, 'duration', true ),
		'location'     => (string) get_post_meta( $post->ID, 'location', true ),
		'excerpt'      => $post->post_excerpt,
		'description'  => trim( wp_strip_all_tags( str_replace( array( '</p>', '<br />', '<br>' ), array( "</p>\n\n", "\n", "\n" ), $post->post_content ) ) ),
		'highlights'   => tac_lines( get_post_meta( $post->ID, 'highlights', true ) ),
		'included'     => tac_lines( get_post_meta( $post->ID, 'included', true ) ),
		'notIncluded'  => tac_lines( get_post_meta( $post->ID, 'not_included', true ) ),
		'amenities'    => tac_lines( get_post_meta( $post->ID, 'amenities', true ) ),
		'itinerary'    => $data['itinerary'],
		'meetingPoint' => (string) get_post_meta( $post->ID, 'meeting_point', true ),
		'languages'    => (string) get_post_meta( $post->ID, 'languages', true ),
		'groupSize'    => (int) get_post_meta( $post->ID, 'group_size', true ),
		'freeCancel'   => (bool) get_post_meta( $post->ID, 'free_cancel', true ),
		'images'       => array_map(
			function ( $id ) {
				return array( 'id' => $id, 'url' => wp_get_attachment_image_url( $id, 'large' ) );
			},
			$images
		),
	);
	return $data;
}

function tac_rest_my_listings( WP_REST_Request $req ) {
	$posts = get_posts(
		array(
			'post_type'   => 'tour',
			'post_status' => array( 'publish', 'pending', 'draft' ),
			'author'      => (int) $req['_tac_user'],
			'numberposts' => TAC_MAX_LISTINGS_PER_HOST,
			'orderby'     => 'modified',
		)
	);
	return array_map( 'tac_format_owned', $posts );
}

function tac_rest_my_listing( WP_REST_Request $req ) {
	$post = tac_owned_listing( $req );
	return is_wp_error( $post ) ? $post : tac_format_owned( $post );
}

/**
 * Validate and save the submitted fields onto a listing. Returns true or WP_Error.
 */
function tac_save_listing_fields( $post_id, WP_REST_Request $req ) {
	$user_id = (int) $req['_tac_user'];

	$term = get_term_by( 'slug', sanitize_title( $req['category'] ), 'tour_category' );
	$kids = $term ? get_term_children( $term->term_id, 'tour_category' ) : array();
	if ( ! $term || ! empty( $kids ) ) {
		return new WP_Error( 'rest_invalid_param', __( 'Choose a listing category.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	wp_set_object_terms( $post_id, $term->term_id, 'tour_category' );

	$dest_id = 0;
	if ( $req['destination'] ) {
		$dest    = get_page_by_path( sanitize_title( $req['destination'] ), OBJECT, 'destination' );
		$dest_id = $dest && 'publish' === $dest->post_status ? $dest->ID : 0;
	}

	$lines = function ( $items ) {
		return implode( "\n", array_filter( array_map( 'sanitize_text_field', (array) $items ) ) );
	};
	$itinerary = implode(
		"\n",
		array_filter(
			array_map(
				function ( $stop ) {
					$title = sanitize_text_field( str_replace( '|', '-', $stop['title'] ?? '' ) );
					return $title ? $title . ' | ' . sanitize_text_field( $stop['details'] ?? '' ) : '';
				},
				(array) $req['itinerary']
			)
		)
	);

	$meta = array(
		'price'          => tac_sanitize_field( 'price', 'number', $req['price'] ),
		'currency'       => tac_sanitize_field( 'currency', 'string', $req['currency'] ),
		'price_unit'     => tac_sanitize_field( 'price_unit', 'string', $req['priceUnit'] ),
		'duration'       => tac_sanitize_field( 'duration', 'string', $req['duration'] ),
		'location'       => tac_sanitize_field( 'location', 'string', $req['location'] ),
		'destination_id' => $dest_id,
		'group_size'     => tac_sanitize_field( 'group_size', 'integer', $req['groupSize'] ),
		'languages'      => tac_sanitize_field( 'languages', 'string', $req['languages'] ),
		'meeting_point'  => tac_sanitize_field( 'meeting_point', 'string', $req['meetingPoint'] ),
		'highlights'     => $lines( $req['highlights'] ),
		'included'       => $lines( $req['included'] ),
		'not_included'   => $lines( $req['notIncluded'] ),
		'amenities'      => $lines( $req['amenities'] ),
		'itinerary'      => $itinerary,
		'free_cancel'    => (bool) $req['freeCancel'],
	);
	foreach ( $meta as $key => $value ) {
		update_post_meta( $post_id, $key, $value );
	}

	// Photos: only images this user uploaded. The first is the main photo.
	$ids = array_values(
		array_filter(
			array_unique( array_map( 'intval', (array) $req['imageIds'] ) ),
			function ( $id ) use ( $user_id ) {
				$att = get_post( $id );
				return $att && 'attachment' === $att->post_type && (int) $att->post_author === $user_id && wp_attachment_is_image( $id );
			}
		)
	);
	if ( $ids ) {
		set_post_thumbnail( $post_id, $ids[0] );
	} else {
		delete_post_thumbnail( $post_id );
	}
	$gallery_ids = array_slice( $ids, 1 );
	update_post_meta( $post_id, 'tac_gallery_ids', $gallery_ids );
	update_post_meta(
		$post_id,
		'gallery',
		implode( "\n", array_filter( array_map( function ( $id ) {
			return wp_get_attachment_image_url( $id, 'large' );
		}, $gallery_ids ) ) )
	);
	update_post_meta( $post_id, 'image_url', '' );
	foreach ( $ids as $id ) {
		wp_update_post( array( 'ID' => $id, 'post_parent' => $post_id ) );
	}
	return true;
}

function tac_listing_postarr( WP_REST_Request $req ) {
	return array(
		'post_title'   => sanitize_text_field( $req['title'] ),
		'post_excerpt' => sanitize_textarea_field( $req['excerpt'] ),
		'post_content' => wpautop( esc_html( sanitize_textarea_field( $req['description'] ) ) ),
		'post_status'  => 'pending',
	);
}

function tac_notify_admin_pending( $post_id, $is_new ) {
	$post = get_post( $post_id );
	$user = get_userdata( (int) $post->post_author );
	wp_mail(
		get_option( 'admin_email' ),
		sprintf( '[%s] %s listing to review: %s', wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ), $is_new ? 'New' : 'Updated', $post->post_title ),
		sprintf(
			"%s (%s) %s a listing.\n\nReview it: %s",
			$user ? $user->display_name : 'A user',
			$user ? $user->user_email : '',
			$is_new ? 'submitted' : 'edited',
			admin_url( 'post.php?action=edit&post=' . $post_id )
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
	if ( null !== $req['accountType'] ) {
		tac_set_account_type( $user_id, $req['accountType'] );
	}
	return tac_format_user( get_userdata( $user_id ) );
}

function tac_rest_create_listing( WP_REST_Request $req ) {
	$user_id = (int) $req['_tac_user'];
	if ( 'supplier' !== tac_account_type( $user_id ) ) {
		return new WP_Error( 'not_supplier', __( 'Switch to a business account to publish listings.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}
	if ( tac_throttled( 'listing_' . $user_id, 20, DAY_IN_SECONDS ) ) {
		return new WP_Error( 'too_many_requests', __( 'You have added many listings today. Try again tomorrow.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}
	$count = count( get_posts( array( 'post_type' => 'tour', 'post_status' => 'any', 'author' => $user_id, 'fields' => 'ids', 'numberposts' => TAC_MAX_LISTINGS_PER_HOST ) ) );
	if ( $count >= TAC_MAX_LISTINGS_PER_HOST ) {
		return new WP_Error( 'limit_reached', __( 'You have reached the maximum number of listings. Contact us to add more.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}

	$post_id = wp_insert_post( array_merge( tac_listing_postarr( $req ), array( 'post_type' => 'tour', 'post_author' => $user_id, 'comment_status' => 'open' ) ), true );
	if ( is_wp_error( $post_id ) ) {
		return new WP_Error( 'save_failed', __( 'Could not save the listing.', 'travel-agency-core' ), array( 'status' => 500 ) );
	}
	$saved = tac_save_listing_fields( $post_id, $req );
	if ( is_wp_error( $saved ) ) {
		wp_delete_post( $post_id, true );
		return $saved;
	}
	tac_notify_admin_pending( $post_id, true );
	return new WP_REST_Response( tac_format_owned( get_post( $post_id ) ), 201 );
}

function tac_rest_update_listing( WP_REST_Request $req ) {
	$post = tac_owned_listing( $req );
	if ( is_wp_error( $post ) ) {
		return $post;
	}
	$updated = wp_update_post( array_merge( tac_listing_postarr( $req ), array( 'ID' => $post->ID ) ), true );
	if ( is_wp_error( $updated ) ) {
		return new WP_Error( 'save_failed', __( 'Could not save the listing.', 'travel-agency-core' ), array( 'status' => 500 ) );
	}
	$saved = tac_save_listing_fields( $post->ID, $req );
	if ( is_wp_error( $saved ) ) {
		return $saved;
	}
	tac_notify_admin_pending( $post->ID, false );
	return tac_format_owned( get_post( $post->ID ) );
}

function tac_rest_delete_listing( WP_REST_Request $req ) {
	$post = tac_owned_listing( $req );
	if ( is_wp_error( $post ) ) {
		return $post;
	}
	wp_trash_post( $post->ID );
	return array( 'deleted' => true );
}

function tac_rest_upload( WP_REST_Request $req ) {
	$user_id = (int) $req['_tac_user'];
	if ( tac_throttled( 'upload_' . $user_id, 60 ) ) {
		return new WP_Error( 'too_many_requests', __( 'Too many uploads. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
	}
	$files = $req->get_file_params();
	$file  = $files['file'] ?? null;
	if ( ! $file || ! empty( $file['error'] ) || empty( $file['tmp_name'] ) ) {
		return new WP_Error( 'rest_invalid_param', __( 'Choose a photo to upload.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	if ( $file['size'] > TAC_MAX_UPLOAD_BYTES ) {
		return new WP_Error( 'too_large', __( 'Photos must be 8 MB or smaller.', 'travel-agency-core' ), array( 'status' => 413 ) );
	}
	$check = wp_check_filetype_and_ext( $file['tmp_name'], $file['name'], array( 'jpg|jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp' ) );
	if ( empty( $check['type'] ) ) {
		return new WP_Error( 'unsupported_type', __( 'Use a JPEG, PNG or WebP photo.', 'travel-agency-core' ), array( 'status' => 415 ) );
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$_FILES['tac_upload'] = $file; // phpcs:ignore WordPress.Security.NonceVerification -- authenticated REST request.
	$id                   = media_handle_upload(
		'tac_upload',
		0,
		array( 'post_author' => $user_id ),
		array(
			'test_form' => false,
			'mimes'     => array( 'jpg|jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp' ),
		)
	);
	unset( $_FILES['tac_upload'] );
	if ( is_wp_error( $id ) ) {
		return new WP_Error( 'upload_failed', $id->get_error_message(), array( 'status' => 400 ) );
	}
	return new WP_REST_Response( array( 'id' => $id, 'url' => wp_get_attachment_image_url( $id, 'large' ) ), 201 );
}
