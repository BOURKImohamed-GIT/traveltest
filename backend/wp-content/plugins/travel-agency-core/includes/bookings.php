<?php
/**
 * Booking requests.
 *
 * A request for a supplier's listing goes to that supplier (their notification email)
 * with a copy to the agency (the site admin email); requests for the agency's own
 * listings go to the agency. Suppliers answer in their dashboard: send an offer,
 * confirm, decline, mark completed. Travellers see the
 * requests they sent in My bookings (matched by account, or by email for
 * requests made before they signed in) and can cancel them. The agency
 * confirms or declines requests in wp-admin (Inquiries), optionally emailing
 * the traveller.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_BOOKING_STATUSES = array( 'requested', 'quoted', 'confirmed', 'declined', 'cancelled', 'completed' );

/** Extra request details by listing type (see listingTypes[].bookingFields in the schema). */
function tac_booking_detail_labels() {
	return array(
		'adults'   => 'Adults',
		'children' => 'Children',
		'time'     => 'Preferred time',
		'option'   => 'Option',
		'package'  => 'Package',
		'ticket'   => 'Ticket type',
		'quantity' => 'Tickets',
		'pickup'   => 'Pickup',
		'dropoff'  => 'Drop-off',
		'flight'   => 'Flight number',
		'luggage'  => 'Luggage',
	);
}

function tac_sanitize_booking_details( $raw ) {
	$out = array();
	foreach ( tac_booking_detail_labels() as $key => $label ) {
		if ( isset( $raw[ $key ] ) && '' !== trim( (string) $raw[ $key ] ) ) {
			$out[ $key ] = in_array( $key, array( 'adults', 'children', 'quantity' ), true ) ? max( 0, min( 99, (int) $raw[ $key ] ) ) : sanitize_text_field( mb_substr( (string) $raw[ $key ], 0, 200 ) );
		}
	}
	return $out;
}

/**
 * The supplier who runs a listing, or null for the agency's own listings.
 */
function tac_listing_supplier( $listing ) {
	$listing = get_post( $listing );
	$author  = $listing ? get_userdata( (int) $listing->post_author ) : false;
	return $author && ! user_can( $author, 'edit_others_posts' ) ? $author : null;
}

function tac_supplier_email( WP_User $user ) {
	return $user->user_email;
}

/** "Email me about new booking requests" in the business profile (on unless switched off). */
function tac_supplier_wants_email( WP_User $user ) {
	return '0' !== (string) get_user_meta( $user->ID, 'sp_notify_email', true );
}

function tac_supplier_name( WP_User $user ) {
	$name = (string) get_user_meta( $user->ID, 'sp_business_name', true );
	return '' !== $name ? $name : $user->display_name;
}

function tac_site_name() {
	return wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
}

/**
 * A link into the React app, e.g. tac_frontend_url( '/account' ).
 */
function tac_frontend_url( $path ) {
	$origins = array_map( 'trim', explode( ',', defined( 'TRAVEL_FRONTEND_ORIGIN' ) ? TRAVEL_FRONTEND_ORIGIN : home_url() ) );
	return untrailingslashit( $origins[0] ) . $path;
}

function tac_format_booking( WP_Post $inquiry ) {
	$listing = get_post( (int) get_post_meta( $inquiry->ID, 'tour_id', true ) );
	$status  = (string) get_post_meta( $inquiry->ID, 'status', true );
	return array(
		'id'        => $inquiry->ID,
		'status'    => in_array( $status, TAC_BOOKING_STATUSES, true ) ? $status : 'requested',
		'date'      => (string) get_post_meta( $inquiry->ID, 'date', true ),
		'guests'    => (int) get_post_meta( $inquiry->ID, 'guests', true ),
		'message'   => (string) get_post_meta( $inquiry->ID, 'message', true ),
		'reply'     => (string) get_post_meta( $inquiry->ID, 'reply', true ),
		'quote'     => (string) get_post_meta( $inquiry->ID, 'quote', true ),
		'details'   => (array) json_decode( (string) get_post_meta( $inquiry->ID, 'details', true ), true ),
		'createdAt' => mysql_to_rfc3339( $inquiry->post_date_gmt ) . 'Z',
		'listing'   => $listing && 'tour' === $listing->post_type ? array(
			'id'    => $listing->ID,
			'slug'  => $listing->post_name,
			'title' => tac_text( $listing->post_title ),
			'image' => tac_image_url( $listing->ID ),
			'live'  => 'publish' === $listing->post_status,
		) : null,
	);
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

/**
 * A traveller's own booking requests: sent while signed in, or earlier from the same email.
 * Contact-form messages (no listing) are not bookings.
 */
function tac_client_inquiries( WP_User $user ) {
	return tac_inquiries(
		array(
			'relation' => 'AND',
			array( 'key' => 'tour_id', 'value' => 0, 'compare' => '>', 'type' => 'NUMERIC' ),
			array(
				'relation' => 'OR',
				array( 'key' => 'client_id', 'value' => $user->ID, 'type' => 'NUMERIC' ),
				array( 'key' => 'email', 'value' => $user->user_email ),
			),
		)
	);
}

/**
 * Email the traveller the answer to their request: an offer, a confirmation or a decline.
 * The sender is the supplier running the listing (Reply-To), or the agency.
 */
function tac_email_booking_update( $inquiry_id ) {
	$status = (string) get_post_meta( $inquiry_id, 'status', true );
	$email  = (string) get_post_meta( $inquiry_id, 'email', true );
	if ( ! in_array( $status, array( 'quoted', 'confirmed', 'declined' ), true ) || ! is_email( $email ) ) {
		return false;
	}
	$listing  = get_post( (int) get_post_meta( $inquiry_id, 'tour_id', true ) );
	$supplier = $listing ? tac_listing_supplier( $listing ) : null;
	$from     = $supplier ? tac_supplier_name( $supplier ) : tac_site_name();
	$reply_to = $supplier ? tac_supplier_email( $supplier ) : get_option( 'admin_email' );
	$reply    = (string) get_post_meta( $inquiry_id, 'reply', true );
	$quote    = (string) get_post_meta( $inquiry_id, 'quote', true );
	$title    = $listing ? $listing->post_title : 'your tour';
	$subjects = array(
		'quoted'    => 'Your offer',
		'confirmed' => 'Your booking is confirmed',
		'declined'  => 'Your booking request was declined',
	);
	$intro    = array(
		'quoted'    => sprintf( 'Thank you for your request for %s on %s (%d guests). Here is our offer.', $title, get_post_meta( $inquiry_id, 'date', true ), (int) get_post_meta( $inquiry_id, 'guests', true ) ),
		'confirmed' => sprintf( 'We have confirmed your request for %s on %s (%d guests).', $title, get_post_meta( $inquiry_id, 'date', true ), (int) get_post_meta( $inquiry_id, 'guests', true ) ),
		'declined'  => sprintf( 'We are sorry, we cannot confirm your request for %s on %s.', $title, get_post_meta( $inquiry_id, 'date', true ) ),
	);
	return wp_mail(
		$email,
		sprintf( '[%s] %s: %s', tac_site_name(), $subjects[ $status ], $listing ? $listing->post_title : '' ),
		implode(
			"\n",
			array_filter(
				array(
					sprintf( 'Hello %s,', get_post_meta( $inquiry_id, 'name', true ) ),
					'',
					$intro[ $status ],
					$quote && 'declined' !== $status ? "\nPrice: " . $quote : '',
					$reply ? "\n" . $reply : '',
					'quoted' === $status ? "\nReply to this email to accept the offer or ask a question." : '',
					"\n" . $from . ( $supplier ? ' — via ' . tac_site_name() : '' ),
				),
				'strlen'
			)
		),
		array( 'Reply-To: ' . $from . ' <' . $reply_to . '>' )
	);
}

add_action( 'rest_api_init', 'tac_register_booking_routes' );

function tac_register_booking_routes() {
	register_rest_route(
		'travel/v1',
		'/me/bookings',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => function ( WP_REST_Request $req ) {
				return array_map( 'tac_format_booking', tac_client_inquiries( get_userdata( $req['_tac_user'] ) ) );
			},
			'permission_callback' => 'tac_require_host',
		)
	);

	register_rest_route(
		'travel/v1',
		'/me/bookings/(?P<id>\d+)/cancel',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'tac_rest_cancel_booking',
			'permission_callback' => 'tac_require_host',
		)
	);
}

/* ---------- Supplier: bookings & inquiries ---------- */

function tac_supplier_inquiries( $user_id ) {
	return tac_inquiries( array( array( 'key' => 'supplier_id', 'value' => (int) $user_id, 'type' => 'NUMERIC' ) ) );
}

/** A request as the supplier sees it: with the traveller's contact details and a private note. */
function tac_format_supplier_booking( WP_Post $inquiry ) {
	return array_merge(
		tac_format_booking( $inquiry ),
		array(
			'name'  => (string) get_post_meta( $inquiry->ID, 'name', true ),
			'email' => (string) get_post_meta( $inquiry->ID, 'email', true ),
			'phone' => (string) get_post_meta( $inquiry->ID, 'phone', true ),
			'note'  => (string) get_post_meta( $inquiry->ID, 'supplier_note', true ),
		)
	);
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'travel/v1',
			'/supplier/bookings',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function ( WP_REST_Request $req ) {
					return array_map( 'tac_format_supplier_booking', tac_supplier_inquiries( $req['_tac_user'] ) );
				},
				'permission_callback' => 'tac_require_supplier',
			)
		);
		register_rest_route(
			'travel/v1',
			'/supplier/bookings/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'tac_rest_supplier_answer_booking',
				'permission_callback' => 'tac_require_supplier',
				'args'                => array(
					'status' => array( 'type' => 'string', 'enum' => array( 'requested', 'quoted', 'confirmed', 'declined', 'completed' ) ),
					'reply'  => array( 'type' => 'string', 'sanitize_callback' => 'sanitize_textarea_field' ),
					'quote'  => array( 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
					'note'   => array( 'type' => 'string', 'sanitize_callback' => 'sanitize_textarea_field' ),
					'notify' => array( 'type' => 'boolean', 'default' => true ),
				),
			)
		);
	}
);

/**
 * Supplier answers a request: offer (price + message), confirm, decline, completed; or a private note.
 * The traveller is emailed for offers, confirmations and declines.
 */
function tac_rest_supplier_answer_booking( WP_REST_Request $req ) {
	$inquiry = get_post( (int) $req['id'] );
	if ( ! $inquiry || 'inquiry' !== $inquiry->post_type || (int) get_post_meta( $inquiry->ID, 'supplier_id', true ) !== (int) $req['_tac_user'] ) {
		return new WP_Error( 'not_found', __( 'Request not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
	}
	$current = (string) get_post_meta( $inquiry->ID, 'status', true );
	foreach ( array( 'reply', 'quote' ) as $key ) {
		if ( null !== $req[ $key ] ) {
			update_post_meta( $inquiry->ID, $key, $req[ $key ] );
		}
	}
	if ( null !== $req['note'] ) {
		update_post_meta( $inquiry->ID, 'supplier_note', $req['note'] );
	}
	$status = $req['status'];
	if ( $status && $status !== $current ) {
		if ( 'cancelled' === $current ) {
			return new WP_Error( 'invalid_state', __( 'The traveller cancelled this request.', 'travel-agency-core' ), array( 'status' => 409 ) );
		}
		if ( 'quoted' === $status && '' === (string) get_post_meta( $inquiry->ID, 'quote', true ) ) {
			return new WP_Error( 'no_quote', __( 'Enter the price of your offer.', 'travel-agency-core' ), array( 'status' => 400 ) );
		}
		update_post_meta( $inquiry->ID, 'status', $status );
		update_post_meta( $inquiry->ID, 'answered_at', time() );
		if ( $req['notify'] ) {
			tac_email_booking_update( $inquiry->ID );
		}
	}
	return tac_format_supplier_booking( get_post( $inquiry->ID ) );
}

function tac_rest_cancel_booking( WP_REST_Request $req ) {
	$found = null;
	foreach ( tac_client_inquiries( get_userdata( $req['_tac_user'] ) ) as $p ) {
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

	$listing  = get_post( (int) get_post_meta( $found->ID, 'tour_id', true ) );
	$supplier = $listing ? tac_listing_supplier( $listing ) : null;
	if ( $supplier && tac_supplier_wants_email( $supplier ) ) {
		wp_mail(
			tac_supplier_email( $supplier ),
			sprintf( '[%s] Booking cancelled: %s', tac_site_name(), $listing->post_title ),
			sprintf( "%s cancelled their request for %s.\n\nYour requests: %s", get_post_meta( $found->ID, 'name', true ), get_post_meta( $found->ID, 'date', true ), tac_frontend_url( '/supplier/bookings' ) )
		);
	}
	wp_mail(
		get_option( 'admin_email' ),
		sprintf( '[%s] Booking cancelled: %s', tac_site_name(), $listing ? $listing->post_title : '' ),
		sprintf(
			"%s cancelled their request for %s.\n\nOpen it: %s",
			get_post_meta( $found->ID, 'name', true ),
			get_post_meta( $found->ID, 'date', true ),
			admin_url( 'post.php?action=edit&post=' . $found->ID )
		)
	);
	return tac_format_booking( get_post( $found->ID ) );
}
