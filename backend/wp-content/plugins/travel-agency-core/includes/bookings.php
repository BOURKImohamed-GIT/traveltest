<?php
/**
 * Booking requests.
 *
 * Every request goes to the agency (the site admin email). Travellers see the
 * requests they sent in My bookings (matched by account, or by email for
 * requests made before they signed in) and can cancel them. The agency
 * confirms or declines requests in wp-admin (Inquiries), optionally emailing
 * the traveller.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_BOOKING_STATUSES = array( 'requested', 'confirmed', 'declined', 'cancelled' );

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
 * Email the traveller that the agency confirmed or declined their request.
 */
function tac_email_booking_update( $inquiry_id ) {
	$status = (string) get_post_meta( $inquiry_id, 'status', true );
	$email  = (string) get_post_meta( $inquiry_id, 'email', true );
	if ( ! in_array( $status, array( 'confirmed', 'declined' ), true ) || ! is_email( $email ) ) {
		return false;
	}
	$listing   = get_post( (int) get_post_meta( $inquiry_id, 'tour_id', true ) );
	$reply     = (string) get_post_meta( $inquiry_id, 'reply', true );
	$confirmed = 'confirmed' === $status;
	return wp_mail(
		$email,
		sprintf( '[%s] %s: %s', tac_site_name(), $confirmed ? 'Your booking is confirmed' : 'Your booking request was declined', $listing ? $listing->post_title : '' ),
		implode(
			"\n",
			array_filter(
				array(
					sprintf(
						'Hello %s,',
						get_post_meta( $inquiry_id, 'name', true )
					),
					'',
					sprintf(
						'We %s your request for %s on %s (%d guests).',
						$confirmed ? 'have confirmed' : 'are sorry, we cannot confirm',
						$listing ? $listing->post_title : 'your tour',
						get_post_meta( $inquiry_id, 'date', true ),
						(int) get_post_meta( $inquiry_id, 'guests', true )
					),
					$reply ? "\n" . $reply : '',
					"\nSee your bookings: " . tac_frontend_url( '/account/bookings' ),
					"\n" . tac_site_name(),
				),
				'strlen'
			)
		),
		array( 'Reply-To: ' . tac_site_name() . ' <' . get_option( 'admin_email' ) . '>' )
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

	$listing = get_post( (int) get_post_meta( $found->ID, 'tour_id', true ) );
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
