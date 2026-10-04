<?php
/**
 * Reviews are WordPress comments on listings, with a 1–5 rating in comment meta.
 * New reviews wait for moderation; the listing's rating/review_count update on approval.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function tac_recalculate_rating( $post_id ) {
	if ( 'tour' !== get_post_type( $post_id ) ) {
		return;
	}

	$comments = get_comments(
		array(
			'post_id'  => $post_id,
			'status'   => 'approve',
			'meta_key' => 'rating', // phpcs:ignore WordPress.DB.SlowDBQuery
			'fields'   => 'ids',
		)
	);

	$total = 0;
	foreach ( $comments as $comment_id ) {
		$total += (int) get_comment_meta( $comment_id, 'rating', true );
	}

	$count = count( $comments );
	update_post_meta( $post_id, 'review_count', $count );
	update_post_meta( $post_id, 'rating', $count ? round( $total / $count, 1 ) : 0 );
}

function tac_recalculate_for_comment( $comment_id ) {
	$comment = get_comment( $comment_id );
	if ( $comment ) {
		tac_recalculate_rating( (int) $comment->comment_post_ID );
	}
}

add_action( 'wp_set_comment_status', 'tac_recalculate_for_comment' );
add_action( 'edit_comment', 'tac_recalculate_for_comment' );
add_action( 'deleted_comment', 'tac_recalculate_for_comment' );
add_action( 'trashed_comment', 'tac_recalculate_for_comment' );

/**
 * Shape a review comment for the REST API.
 */
function tac_format_review( WP_Comment $comment ) {
	return array(
		'id'         => (int) $comment->comment_ID,
		'author'     => $comment->comment_author,
		'title'      => (string) get_comment_meta( $comment->comment_ID, 'title', true ),
		'rating'     => (int) get_comment_meta( $comment->comment_ID, 'rating', true ),
		'content'    => wp_strip_all_tags( $comment->comment_content ),
		'tripType'   => (string) get_comment_meta( $comment->comment_ID, 'trip_type', true ),
		'travelDate' => (string) get_comment_meta( $comment->comment_ID, 'travel_date', true ),
		'date'       => mysql_to_rfc3339( $comment->comment_date_gmt ) . 'Z',
	);
}

// Make sure every listing has aggregate meta so sorting by rating includes unreviewed ones.
add_action(
	'save_post_tour',
	function ( $post_id ) {
		add_post_meta( $post_id, 'rating', 0, true );
		add_post_meta( $post_id, 'review_count', 0, true );
		add_post_meta( $post_id, 'price', 0, true );
	}
);
