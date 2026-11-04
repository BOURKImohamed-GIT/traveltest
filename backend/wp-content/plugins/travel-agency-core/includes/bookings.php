<?php
/**
 * Booking requests.
 *
 * A request for a supplier's listing goes to that supplier's email only (a copy to the
 * agency if "Send me a copy" is on in Agency details); requests for the agency's own
 * listings go to the agency (the site admin email). Suppliers answer in their dashboard: send an offer,
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
 * Who receives the traveller's emails for a request: the email typed in the booking form and,
 * when they were signed in, the email of their account (the one they signed up with).
 */
function tac_booking_traveller_emails( $inquiry_id ) {
	$emails = array( (string) get_post_meta( $inquiry_id, 'email', true ) );
	$client = get_userdata( (int) get_post_meta( $inquiry_id, 'client_id', true ) );
	if ( $client ) {
		$emails[] = $client->user_email;
	}
	return array_values( array_unique( array_filter( array_map( 'strtolower', $emails ), 'is_email' ) ) );
}

/**
 * Email the traveller about their booking request, with every detail of it.
 * Sent when the request is received, and when it is offered, confirmed, declined, cancelled
 * or completed. Replies go straight to the business that runs the experience.
 */
function tac_email_booking_update( $inquiry_id ) {
	$status = (string) get_post_meta( $inquiry_id, 'status', true );
	$to     = tac_booking_traveller_emails( $inquiry_id );
	if ( ! in_array( $status, array( 'requested', 'quoted', 'confirmed', 'declined', 'cancelled', 'completed' ), true ) || ! $to ) {
		return false;
	}
	$m        = fn( $k ) => (string) get_post_meta( $inquiry_id, $k, true );
	$listing  = get_post( (int) $m( 'tour_id' ) );
	$supplier = $listing ? tac_listing_supplier( $listing ) : null;
	$business = $supplier ? tac_supplier_name( $supplier ) : tac_site_name();
	$reply_to = $supplier ? tac_supplier_email( $supplier ) : get_option( 'admin_email' );
	$title    = $listing ? $listing->post_title : __( 'your experience', 'travel-agency-core' );
	$link     = $listing ? tac_frontend_url( '/tour/' . $listing->post_name . '/' ) : tac_frontend_url( '/' );
	$day      = $m( 'date' ) ? date_i18n( 'l j F Y', strtotime( $m( 'date' ) ) ) : '';
	$site     = tac_site_name();

	$texts = array(
		'requested' => array( 'Booking request received', 'Your request has been sent', sprintf( 'Thank you! %s has received your request and usually answers within 24 hours. Nothing is charged until you agree on the details with them.', $business ), '#c75300' ),
		'quoted'    => array( 'You have an offer', sprintf( '%s sent you an offer', $business ), 'Check the price and details below. Reply to this email to accept the offer or ask a question.', '#1d5fbf' ),
		'confirmed' => array( 'Booking confirmed', 'Your booking is confirmed', sprintf( '%s has confirmed your booking. See you soon!', $business ), '#1e7d3c' ),
		'declined'  => array( 'Booking request declined', 'Your request could not be confirmed', sprintf( 'We are sorry: %s cannot confirm this request. Other experiences may still be available on your date.', $business ), '#c62828' ),
		'cancelled' => array( 'Booking cancelled', 'Your request is cancelled', sprintf( 'You cancelled this request. %s has been told.', $business ), '#5f6b7a' ),
		'completed' => array( 'Thank you for travelling with us', 'We hope you had a great time', sprintf( 'Your experience with %s is complete. A short review helps other travellers and the business.', $business ), '#1e7d3c' ),
	)[ $status ];

	$details = json_decode( $m( 'details' ), true );
	$rows    = array(
		__( 'Experience', 'travel-agency-core' ) => '<a href="' . esc_url( $link ) . '" style="color:#c75300;font-weight:700">' . esc_html( $title ) . '</a>',
		__( 'Run by', 'travel-agency-core' )     => esc_html( $business ),
		__( 'Date', 'travel-agency-core' )       => esc_html( $day ),
		__( 'Guests', 'travel-agency-core' )     => esc_html( (string) (int) $m( 'guests' ) ),
	);
	foreach ( is_array( $details ) ? $details : array() as $key => $value ) {
		$label = tac_booking_detail_labels()[ $key ] ?? '';
		if ( $label ) {
			$rows[ $label ] = esc_html( (string) $value );
		}
	}
	if ( $m( 'quote' ) && 'declined' !== $status ) {
		$rows[ __( 'Price', 'travel-agency-core' ) ] = '<strong>' . esc_html( $m( 'quote' ) ) . '</strong>';
	}
	$rows[ __( 'Your name', 'travel-agency-core' ) ] = esc_html( $m( 'name' ) );
	if ( $m( 'phone' ) ) {
		$rows[ __( 'Your phone', 'travel-agency-core' ) ] = esc_html( $m( 'phone' ) );
	}
	$rows[ __( 'Request number', 'travel-agency-core' ) ] = '#' . (int) $inquiry_id;

	$table = '';
	foreach ( $rows as $label => $html ) {
		if ( '' === trim( wp_strip_all_tags( $html ) ) ) {
			continue;
		}
		$table .= '<tr><td style="padding:8px 12px;color:#5f6b7a;font-size:14px;width:38%;border-bottom:1px solid #eef0f3">' . esc_html( $label ) . '</td><td style="padding:8px 12px;font-size:14px;color:#1a2b49;border-bottom:1px solid #eef0f3">' . $html . '</td></tr>';
	}
	$blocks = '';
	if ( $m( 'message' ) && 'requested' === $status ) {
		$blocks .= '<p style="margin:16px 0 4px;font-size:13px;color:#5f6b7a;text-transform:uppercase;letter-spacing:.04em;font-weight:700">' . esc_html__( 'Your message', 'travel-agency-core' ) . '</p><p style="margin:0;font-size:15px;white-space:pre-line">' . esc_html( $m( 'message' ) ) . '</p>';
	}
	if ( $m( 'reply' ) && in_array( $status, array( 'quoted', 'confirmed', 'declined' ), true ) ) {
		$blocks .= '<div style="margin:16px 0 0;padding:12px 14px;background:#f5f6f8;border-left:4px solid ' . $texts[3] . ';border-radius:6px"><p style="margin:0 0 4px;font-size:13px;color:#5f6b7a;font-weight:700">' . esc_html( sprintf( /* translators: %s: business */ __( 'Message from %s', 'travel-agency-core' ), $business ) ) . '</p><p style="margin:0;font-size:15px;white-space:pre-line">' . esc_html( $m( 'reply' ) ) . '</p></div>';
	}
	$button = 'completed' === $status
		? array( $link . '#reviews', __( 'Write a review', 'travel-agency-core' ) )
		: array( tac_frontend_url( '/account' ), __( 'See my bookings', 'travel-agency-core' ) );

	$html = '<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a2b49">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:24px 12px"><tr><td align="center">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e6eb">'
		. '<tr><td style="background:' . $texts[3] . ';padding:18px 24px;color:#fff;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">' . esc_html( $site . ' · ' . $texts[0] ) . '</td></tr>'
		. '<tr><td style="padding:24px">'
		. '<h1 style="margin:0 0 8px;font-size:22px;line-height:1.3">' . esc_html( $texts[1] ) . '</h1>'
		. '<p style="margin:0 0 6px;font-size:15px">' . esc_html( sprintf( /* translators: %s: name */ __( 'Hello %s,', 'travel-agency-core' ), $m( 'name' ) ) ) . '</p>'
		. '<p style="margin:0 0 18px;font-size:15px;line-height:1.5">' . esc_html( $texts[2] ) . '</p>'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef0f3;border-radius:8px;border-collapse:separate">' . $table . '</table>'
		. $blocks
		. '<p style="margin:24px 0 8px"><a href="' . esc_url( $button[0] ) . '" style="display:inline-block;background:#c75300;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">' . esc_html( $button[1] ) . '</a></p>'
		. '<p style="margin:16px 0 0;font-size:13px;color:#5f6b7a;line-height:1.5">' . esc_html( sprintf( /* translators: %s: business */ __( 'Questions? Reply to this email: it goes straight to %s.', 'travel-agency-core' ), $business ) ) . '</p>'
		. '</td></tr>'
		. '<tr><td style="padding:14px 24px;background:#fafbfc;border-top:1px solid #eef0f3;font-size:12px;color:#8a94a3">' . esc_html( sprintf( /* translators: 1: business, 2: site */ __( '%1$s runs this experience and answers your request. Sent by %2$s, the marketplace for experiences in Morocco.', 'travel-agency-core' ), $business, $site ) ) . '</td></tr>'
		. '</table></td></tr></table></body></html>';

	return wp_mail(
		$to,
		sprintf( '[%s] %s: %s', $site, $texts[0], $title ),
		$html,
		array( 'Content-Type: text/html; charset=UTF-8', 'Reply-To: ' . $business . ' <' . $reply_to . '>' )
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
	tac_email_booking_update( $found->ID ); // Confirmation to the traveller.

	$listing  = get_post( (int) get_post_meta( $found->ID, 'tour_id', true ) );
	$supplier = $listing ? tac_listing_supplier( $listing ) : null;
	if ( $supplier ) {
		wp_mail(
			tac_supplier_email( $supplier ),
			sprintf( '[%s] Booking cancelled: %s', tac_site_name(), $listing->post_title ),
			sprintf( "%s cancelled their request for %s.\n\nYour requests: %s", get_post_meta( $found->ID, 'name', true ), get_post_meta( $found->ID, 'date', true ), tac_frontend_url( '/supplier/bookings' ) )
		);
	}
	if ( ! $supplier || tac_settings()['copy_supplier_requests'] ) {
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
	}
	return tac_format_booking( get_post( $found->ID ) );
}
