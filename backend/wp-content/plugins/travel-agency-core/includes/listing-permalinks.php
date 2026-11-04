<?php
/**
 * Listing addresses (/tour/<slug>/) that never clash between businesses.
 *
 * A business's listing address is its title followed by the business's own page name:
 *   "Transfer from airport Marrakech to Ouarzazate" by Atlas Trekking Imlil
 *   → /tour/transfer-from-airport-marrakech-to-ouarzazate-atlas-trekking-imlil/
 * So two businesses can offer the same tour with different, readable addresses. Only a
 * business's own copy of the same title gets a number (-2). The address follows the title
 * and business name; old addresses keep working and lead to the current one.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Longest title part of a listing address, in characters. */
const TAC_SLUG_TITLE_MAX = 70;

/** The address a business's listing should have (before the uniqueness check). */
function tac_listing_slug( $title, WP_User $business ) {
	$base   = sanitize_title( $title );
	$suffix = $business->user_nicename;
	if ( '' === $base ) {
		return '';
	}
	if ( $suffix && ( $base === $suffix || str_ends_with( $base, '-' . $suffix ) ) ) {
		$base = trim( substr( $base, 0, - strlen( $suffix ) ), '-' );
	}
	$base = trim( substr( $base, 0, TAC_SLUG_TITLE_MAX ), '-' );
	return $suffix ? ( '' !== $base ? $base . '-' . $suffix : $suffix ) : $base;
}

// Every save of a business's listing (dashboard, wp-admin, imports) gets its address this way.
add_filter(
	'wp_insert_post_data',
	function ( $data, $postarr ) {
		if ( 'tour' !== $data['post_type'] || in_array( $data['post_status'], array( 'auto-draft', 'trash' ), true ) ) {
			return $data;
		}
		$business = get_userdata( (int) $data['post_author'] );
		if ( ! $business || ! in_array( TAC_SUPPLIER_ROLE, (array) $business->roles, true ) ) {
			return $data; // Listings not owned by a business keep WordPress's usual address.
		}
		$slug = tac_listing_slug( $data['post_title'], $business );
		if ( '' === $slug ) {
			return $data;
		}
		$id = (int) ( $postarr['ID'] ?? 0 );
		// Re-saved without a title change: keep the address it already has ("…-2" included).
		$current = $id ? (string) get_post_field( 'post_name', $id ) : '';
		if ( '' !== $current && preg_match( '/^' . preg_quote( $slug, '/' ) . '(-\d+)?$/', $current ) ) {
			$data['post_name'] = $current;
			return $data;
		}
		// Check against every listing, including drafts, and against addresses other listings used
		// before, so an old link never leads to a different listing.
		global $wpdb;
		$candidate = $slug;
		for ( $n = 2; $n < 500; $n++ ) {
			$taken = $wpdb->get_var( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_name = %s AND post_type = 'tour' AND ID <> %d LIMIT 1", $candidate, $id ) );
			if ( ! $taken && ! tac_slug_used_before( $candidate, $id ) ) {
				break;
			}
			$candidate = $slug . '-' . $n;
		}
		// Last safety net (reserved words, other post types…): WordPress's own check.
		$data['post_name'] = wp_unique_post_slug( $candidate, $id, 'publish', 'tour', (int) $data['post_parent'] );
		return $data;
	},
	20,
	2
);

// Keep track of a published listing's previous address so old links still work
// (WordPress only does this for edits made in wp-admin).
add_action(
	'post_updated',
	function ( $post_id, WP_Post $after, WP_Post $before ) {
		if ( 'tour' !== $after->post_type || $after->post_name === $before->post_name || '' === $before->post_name ) {
			return;
		}
		$old = get_post_meta( $post_id, '_wp_old_slug' );
		if ( ! in_array( $before->post_name, $old, true ) ) {
			add_post_meta( $post_id, '_wp_old_slug', $before->post_name );
		}
		// An address now used again by this listing is no longer "old".
		delete_post_meta( $post_id, '_wp_old_slug', $after->post_name );
	},
	10,
	3
);

/** True when another listing had this address before (it still answers to it). */
function tac_slug_used_before( $slug, $exclude_id ) {
	global $wpdb;
	return (bool) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT pm.post_id FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE pm.meta_key = '_wp_old_slug' AND pm.meta_value = %s AND p.post_type = 'tour' AND pm.post_id <> %d LIMIT 1",
			$slug,
			(int) $exclude_id
		)
	);
}

/** A listing by its current or a previous address. */
function tac_listing_by_slug( $slug ) {
	$post = get_page_by_path( $slug, OBJECT, 'tour' );
	if ( $post ) {
		return $post;
	}
	$ids = get_posts(
		array(
			'post_type'   => 'tour',
			'post_status' => 'publish',
			'numberposts' => 1,
			'fields'      => 'ids',
			'meta_key'    => '_wp_old_slug', // phpcs:ignore WordPress.DB.SlowDBQuery
			'meta_value'  => $slug, // phpcs:ignore WordPress.DB.SlowDBQuery
		)
	);
	return $ids ? get_post( $ids[0] ) : null;
}

/** 1.18 upgrade: give every existing business listing its new address (old ones keep working). */
function tac_upgrade_listing_slugs() {
	$businesses = get_users( array( 'role' => TAC_SUPPLIER_ROLE, 'fields' => 'ID', 'number' => -1 ) );
	if ( ! $businesses ) {
		return;
	}
	$posts = get_posts( array( 'post_type' => 'tour', 'post_status' => array( 'publish', 'pending', 'draft', 'archived' ), 'author__in' => array_map( 'intval', $businesses ), 'numberposts' => -1 ) );
	foreach ( $posts as $post ) {
		wp_update_post( array( 'ID' => $post->ID ) ); // The filter above sets the address.
	}
}
