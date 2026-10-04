<?php
/**
 * Booking requests in the dashboards.
 *
 * Clients see the requests they sent (matched by account, or by email for
 * requests made before they signed in) and can cancel them. Suppliers see the
 * requests for their own listings and can confirm or decline them; the client
 * is emailed each time the status changes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_BOOKING_STATUSES = array( 'requested', 'confirmed', 'declined', 'cancelled' );

/**
 * The business that owns a listing, or 0 when the site team runs it.
 */
function tac_listing_owner_id( WP_Post $listing ) {
	$author = get_userdata( (int) $listing->post_author );
	return $author && ! user_can( $author, 'edit_others_posts' ) ? $author->ID : 0;
}

function tac_inquiry_recipient( $owner_id ) {
	$owner = $owner_id ? get_userdata( $owner_id ) : null;
	return $owner && is_email( $owner->user_email ) ? $owner->user_email : get_option( 'admin_email' );
}

/**
 * A link into the React app, e.g. tac_frontend_url( '/account' ).
 */
function tac_frontend_url( $path ) {
	$origins = array_map( 'trim', explode( ',', defined( 'TRAVEL_FRONTEND_ORIGIN' ) ? TRAVEL_FRONTEND_ORIGIN : home_url() ) );
	return untrailingslashit( $origins[0] ) . $path;
}

function tac_format_booking( WP_Post $inquiry, $for_supplier ) {
	$listing = get_post( (int) get_post_meta( $inquiry->ID, 'tour_id', true ) );
	$status  = (string) get_post_meta( $inquiry->ID, 'status', true );
	$data    = array(
		'id'        => $inquiry->ID,
		'status'    => in_array( $status, TAC_BOOKING_STATUSES, true ) ? $status : 'requested',
		'date'      => (string) get_post_meta( $inquiry->ID, 'date', true ),
		'guests'    => (int) get_post_meta( $inquiry->ID, 'guests', true ),
		'message'   => (string) get_post_meta( $inquiry->ID, 'message', true ),
		'reply'     => (string) get_post_meta( $inquiry->ID, 'reply', true ),
		'createdAt' => mysql_to_rfc3339( $inquiry->post_date_gmt ) . 'Z',
		'listing'   => $listing ? array(
			'id'    => $listing->ID,
			'slug'  => $listing->post_name,
			'title' => tac_text( $listing->post_title ),
			'image' => tac_image_url( $listing->ID ),
			'live'  => 'publish' === $listing->post_status,
		) : null,
	);
	if ( $for_supplier ) {
		$data['client'] = array(
			'name'  => (string) get_post_meta( $inquiry->ID, 'name', true ),
			'email' => (string) get_post_meta( $inquiry->ID, 'email', true ),
			'phone' => (string) get_post_meta( $inquiry->ID, 'phone', true ),
		);
	} else {
		$owner           = get_userdata( (int) get_post_meta( $inquiry->ID, 'owner_id', true ) );
		$data['business'] = $owner ? array(
			'name'  => $owner->display_name,
			'email' => $owner->user_email,
			'phone' => (string) get_user_meta( $owner->ID, 'tac_phone', true ),
		) : array(
			'name'  => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
			'email' => get_option( 'admin_email' ),
			'phone' => '',
		);
	}
	return $data;
}

function tac_inquiries( array $meta_query ) {
	return get_posts(
		array(
			'post_type'   => 'inquiry',
			'post_status' => 'private',
			'numberposts' => 200,
			'orderby'     => 'date',
			'order'       => 'DESC',
			'meta_query'  => $meta_query, // phpcs:ignore WordPress.DB.SlowDBQuery
		)
	);
}

add_action( 'rest_api_init', 'tac_register_booking_routes' );

function tac_register_booking_routes() {
	$ns = 'travel/v1';

	register_rest_route(
		$ns,
		'/me/bookings',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'tac_rest_my_bookings',
			'permission_callback' => 'tac_require_host',
		)
	);

	register_rest_route(
		$ns,
		'/me/bookings/(?P<id>\d+)/cancel',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_cancel_booking',
			'permission_callback' => 'tac_require_host',
		)
	);

	register_rest_route(
		$ns,
		'/me/requests',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'tac_rest_my_requests',
			'permission_callback' => 'tac_require_host',
		)
	);

	register_rest_route(
		$ns,
		'/me/requests/(?P<id>\d+)',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_answer_request',
			'permission_callback' => 'tac_require_host',
			'args'                => array(
				'status' => array( 'type' => 'string', 'required' => true, 'enum' => array( 'confirmed', 'declined' ) ),
				'reply'  => array( 'type' => 'string', 'default' => '', 'maxLength' => 2000, 'sanitize_callback' => 'sanitize_textarea_field' ),
			),
		)
	);
}

/**
 * A client's own requests: sent while signed in, or earlier from the same email.
 */
function tac_client_inquiries( WP_User $user ) {
	return tac_inquiries(
		array(
			'relation' => 'OR',
			array( 'key' => 'client_id', 'value' => $user->ID, 'type' => 'NUMERIC' ),
			array( 'key' => 'email', 'value' => $user->user_email ),
		)
	);
}

function tac_rest_my_bookings( WP_REST_Request $req ) {
	$user = get_userdata( $req['_tac_user'] );
	return array_map(
		function ( $p ) {
			return tac_format_booking( $p, false );
		},
		tac_client_inquiries( $user )
	);
}

function tac_rest_cancel_booking( WP_REST_Request $req ) {
	$user  = get_userdata( $req['_tac_user'] );
	$found = null;
	foreach ( tac_client_inquiries( $user ) as $p ) {
		if ( (int) $p->ID === (int) $req['id'] ) {
			$found = $p;
		}
	}
	if ( ! $found ) {
		return new WP_Error( 'not_found', __( 'Booking not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
	}
	if ( in_array( get_post_meta( $found->ID, 'status', true ), array( 'declined', 'cancelled' ), true ) ) {
		return new WP_Error( 'invalid_state', __( 'This request is already closed.', 'travel-agency-core' ), array( 'status' => 409 ) );
	}
	update_post_meta( $found->ID, 'status', 'cancelled' );

	$listing = get_post( (int) get_post_meta( $found->ID, 'tour_id', true ) );
	wp_mail(
		tac_inquiry_recipient( (int) get_post_meta( $found->ID, 'owner_id', true ) ),
		sprintf( '[%s] Booking cancelled: %s', wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ), $listing ? $listing->post_title : '' ),
		sprintf( "%s cancelled their request for %s.\n\n%s", get_post_meta( $found->ID, 'name', true ), get_post_meta( $found->ID, 'date', true ), tac_frontend_url( '/account/requests' ) )
	);
	return tac_format_booking( get_post( $found->ID ), false );
}

function tac_rest_my_requests( WP_REST_Request $req ) {
	return array_map(
		function ( $p ) {
			return tac_format_booking( $p, true );
		},
		tac_inquiries( array( array( 'key' => 'owner_id', 'value' => (int) $req['_tac_user'], 'type' => 'NUMERIC' ) ) )
	);
}

function tac_rest_answer_request( WP_REST_Request $req ) {
	$inquiry = get_post( (int) $req['id'] );
	if ( ! $inquiry || 'inquiry' !== $inquiry->post_type || (int) get_post_meta( $inquiry->ID, 'owner_id', true ) !== (int) $req['_tac_user'] ) {
		return new WP_Error( 'not_found', __( 'Request not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
	}
	if ( 'cancelled' === get_post_meta( $inquiry->ID, 'status', true ) ) {
		return new WP_Error( 'invalid_state', __( 'The client cancelled this request.', 'travel-agency-core' ), array( 'status' => 409 ) );
	}
	update_post_meta( $inquiry->ID, 'status', $req['status'] );
	update_post_meta( $inquiry->ID, 'reply', $req['reply'] );

	$owner   = get_userdata( (int) $req['_tac_user'] );
	$listing = get_post( (int) get_post_meta( $inquiry->ID, 'tour_id', true ) );
	$client  = (string) get_post_meta( $inquiry->ID, 'email', true );
	if ( is_email( $client ) ) {
		$confirmed = 'confirmed' === $req['status'];
		wp_mail(
			$client,
			sprintf(
				'[%s] %s: %s',
				wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
				$confirmed ? 'Your booking is confirmed' : 'Your booking request was declined',
				$listing ? $listing->post_title : ''
			),
			implode(
				"\n",
				array_filter(
					array(
						sprintf( '%s %s your request for %s (%d guests).', $owner->display_name, $confirmed ? 'confirmed' : 'declined', get_post_meta( $inquiry->ID, 'date', true ), (int) get_post_meta( $inquiry->ID, 'guests', true ) ),
						$req['reply'] ? "\nMessage from " . $owner->display_name . ":\n" . $req['reply'] : '',
						"\nSee your bookings: " . tac_frontend_url( '/account/bookings' ),
					)
				)
			),
			array( 'Reply-To: ' . $owner->display_name . ' <' . $owner->user_email . '>' )
		);
	}
	return tac_format_booking( get_post( $inquiry->ID ), true );
}
