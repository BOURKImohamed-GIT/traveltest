<?php
/**
 * Classic meta boxes so editors can fill listing details in wp-admin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'add_meta_boxes',
	function () {
		add_meta_box( 'tac_tour_details', __( 'Listing details', 'travel-agency-core' ), 'tac_render_fields_box', 'tour', 'normal', 'high', array( 'fields' => tac_tour_fields() ) );
		add_meta_box( 'tac_destination_details', __( 'Destination details', 'travel-agency-core' ), 'tac_render_fields_box', 'destination', 'normal', 'high', array( 'fields' => tac_destination_fields() ) );
	}
);

function tac_render_fields_box( $post, $box ) {
	wp_nonce_field( 'tac_save_fields', 'tac_fields_nonce' );
	echo '<table class="form-table">';
	foreach ( $box['args']['fields'] as $key => $def ) {
		list( $type, $label ) = $def;
		$value                = get_post_meta( $post->ID, $key, true );
		$id                   = 'tac_' . $key;
		echo '<tr><th><label for="' . esc_attr( $id ) . '">' . esc_html( $label ) . '</label></th><td>';

		if ( 'destination_id' === $key ) {
			$destinations = get_posts(
				array(
					'post_type'   => 'destination',
					'numberposts' => -1,
					'orderby'     => 'title',
					'order'       => 'ASC',
				)
			);
			echo '<select id="' . esc_attr( $id ) . '" name="' . esc_attr( $id ) . '"><option value="0">—</option>';
			foreach ( $destinations as $d ) {
				echo '<option value="' . esc_attr( $d->ID ) . '"' . selected( (int) $value, $d->ID, false ) . '>' . esc_html( $d->post_title ) . '</option>';
			}
			echo '</select>';
		} elseif ( 'boolean' === $type ) {
			echo '<input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $id ) . '" value="1"' . checked( (bool) $value, true, false ) . '>';
		} elseif ( in_array( $key, array( 'gallery', 'highlights' ), true ) ) {
			echo '<textarea class="large-text" rows="4" id="' . esc_attr( $id ) . '" name="' . esc_attr( $id ) . '">' . esc_textarea( $value ) . '</textarea>';
		} else {
			$input_type = 'number' === $type || 'integer' === $type ? 'number' : 'text';
			$step       = 'number' === $type ? ' step="0.01"' : '';
			echo '<input class="regular-text" type="' . esc_attr( $input_type ) . '"' . $step . ' id="' . esc_attr( $id ) . '" name="' . esc_attr( $id ) . '" value="' . esc_attr( $value ) . '">'; // phpcs:ignore WordPress.Security.EscapeOutput -- $step is a literal.
		}
		echo '</td></tr>';
	}
	echo '</table>';
}

add_action( 'save_post_tour', 'tac_save_fields_box', 10, 2 );
add_action( 'save_post_destination', 'tac_save_fields_box', 10, 2 );

function tac_save_fields_box( $post_id, $post ) {
	if ( ! isset( $_POST['tac_fields_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['tac_fields_nonce'] ), 'tac_save_fields' ) ) {
		return;
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	$fields = 'tour' === $post->post_type ? tac_tour_fields() : tac_destination_fields();
	foreach ( $fields as $key => $def ) {
		$raw = isset( $_POST[ 'tac_' . $key ] ) ? wp_unslash( $_POST[ 'tac_' . $key ] ) : null; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- sanitized per type below.
		switch ( $def[0] ) {
			case 'boolean':
				$value = ! empty( $raw );
				break;
			case 'integer':
				$value = absint( $raw );
				break;
			case 'number':
				$value = is_numeric( $raw ) ? (float) $raw : 0;
				break;
			default:
				if ( 'image_url' === $key ) {
					$value = esc_url_raw( (string) $raw );
				} elseif ( in_array( $key, array( 'gallery', 'highlights' ), true ) ) {
					$value = sanitize_textarea_field( (string) $raw );
				} else {
					$value = sanitize_text_field( (string) $raw );
				}
		}
		update_post_meta( $post_id, $key, $value );
	}
}
