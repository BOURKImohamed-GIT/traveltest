<?php
/**
 * Photos attached to reviews and to team ↔ business messages.
 * Uploaded as multipart form data under a field such as photos[] (several files).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_PHOTO_MAX_BYTES = 8 * MB_IN_BYTES;

/**
 * Save the images uploaded in $_FILES[$field] (one file or several) to the Media Library.
 *
 * @param string $field   Form field name, without [].
 * @param int    $max     Most files accepted.
 * @param int    $owner   User id that owns the attachments (0 for visitors).
 * @param string $purpose Stored as _tac_photo_for meta ('review', 'message').
 * @return int[]|WP_Error Attachment ids (empty when nothing was uploaded).
 */
function tac_save_uploaded_photos( $field, $max, $owner, $purpose ) {
	// phpcs:ignore WordPress.Security.NonceVerification -- REST/admin-post handlers check permissions and nonces.
	if ( empty( $_FILES[ $field ] ) || empty( $_FILES[ $field ]['name'] ) ) {
		return array();
	}
	$raw   = $_FILES[ $field ]; // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput
	$files = array();
	if ( is_array( $raw['name'] ) ) {
		foreach ( array_keys( $raw['name'] ) as $i ) {
			if ( '' !== (string) $raw['name'][ $i ] ) {
				$files[] = array(
					'name'     => $raw['name'][ $i ],
					'tmp_name' => $raw['tmp_name'][ $i ],
					'error'    => $raw['error'][ $i ],
					'size'     => $raw['size'][ $i ],
				);
			}
		}
	} else {
		$files[] = $raw;
	}
	if ( count( $files ) > $max ) {
		/* translators: %d: number of photos */
		return new WP_Error( 'too_many_photos', sprintf( _n( 'You can add up to %d photo.', 'You can add up to %d photos.', $max, 'travel-agency-core' ), $max ), array( 'status' => 400 ) );
	}
	foreach ( $files as $f ) {
		if ( ! empty( $f['error'] ) ) {
			return new WP_Error( 'upload_failed', __( 'A photo could not be uploaded. Try a smaller file.', 'travel-agency-core' ), array( 'status' => 400 ) );
		}
		if ( (int) $f['size'] > TAC_PHOTO_MAX_BYTES ) {
			return new WP_Error( 'too_big', __( 'Photos can be up to 8 MB each.', 'travel-agency-core' ), array( 'status' => 400 ) );
		}
		$check = wp_check_filetype_and_ext( $f['tmp_name'], $f['name'], tac_image_mimes() );
		if ( ! $check['type'] || ! @getimagesize( $f['tmp_name'] ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors
			return new WP_Error( 'bad_type', __( 'Photos must be JPG, PNG or WebP images.', 'travel-agency-core' ), array( 'status' => 400 ) );
		}
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$ids      = array();
	$previous = get_current_user_id();
	wp_set_current_user( $owner );
	foreach ( $files as $f ) {
		$id = media_handle_sideload( array( 'name' => sanitize_file_name( $f['name'] ), 'tmp_name' => $f['tmp_name'] ), 0, null, array( 'post_author' => $owner ) );
		if ( is_wp_error( $id ) ) {
			wp_set_current_user( $previous );
			array_map( fn( $done ) => wp_delete_attachment( $done, true ), $ids );
			return new WP_Error( 'upload_failed', __( 'A photo could not be saved. Try again.', 'travel-agency-core' ), array( 'status' => 500 ) );
		}
		update_post_meta( $id, '_tac_photo_for', $purpose );
		$ids[] = $id;
	}
	wp_set_current_user( $previous );
	return $ids;
}

/** [{id, thumb, url}] for a list of attachment ids. */
function tac_photo_list( $ids ) {
	$out = array();
	foreach ( array_filter( array_map( 'absint', is_array( $ids ) ? $ids : explode( ',', (string) $ids ) ) ) as $id ) {
		$url = wp_get_attachment_image_url( $id, 'large' );
		if ( $url ) {
			$out[] = array( 'id' => $id, 'thumb' => wp_get_attachment_image_url( $id, 'medium' ), 'url' => $url );
		}
	}
	return $out;
}

/* ---------- Reviews ---------- */

// Deleting a review deletes its photos.
add_action(
	'delete_comment',
	function ( $comment_id ) {
		foreach ( tac_photo_list( get_comment_meta( $comment_id, 'photos', true ) ) as $p ) {
			wp_delete_attachment( $p['id'], true );
		}
	}
);

// wp-admin → Comments: show a review's photos so the team can check them before approving.
add_filter(
	'comment_text',
	function ( $text, $comment = null ) {
		if ( ! is_admin() || ! $comment instanceof WP_Comment ) {
			return $text;
		}
		$photos = tac_photo_list( get_comment_meta( $comment->comment_ID, 'photos', true ) );
		if ( ! $photos ) {
			return $text;
		}
		$html = '<p>';
		foreach ( $photos as $p ) {
			$html .= '<a href="' . esc_url( $p['url'] ) . '" target="_blank" rel="noopener"><img src="' . esc_url( $p['thumb'] ) . '" alt="" style="width:96px;height:72px;object-fit:cover;border-radius:6px;margin:4px 6px 0 0"></a>';
		}
		return $text . $html . '</p>';
	},
	10,
	2
);
