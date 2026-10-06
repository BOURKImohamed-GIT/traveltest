<?php
/**
 * Classic meta boxes so editors can fill tour details in wp-admin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'add_meta_boxes',
	function () {
		add_meta_box( 'tac_tour_details', __( 'Tour details', 'travel-agency-core' ), 'tac_render_fields_box', 'tour', 'normal', 'high', array( 'fields' => tac_tour_fields() ) );
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

		if ( 'price_unit' === $key ) {
			echo '<select id="' . esc_attr( $id ) . '" name="' . esc_attr( $id ) . '">';
			foreach ( tac_price_units() as $unit => $unit_label ) {
				echo '<option value="' . esc_attr( $unit ) . '"' . selected( $value ?: 'per_adult', $unit, false ) . '>' . esc_html( $unit_label ) . '</option>';
			}
			echo '</select>';
		} elseif ( 'boolean' === $type ) {
			echo '<input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $id ) . '" value="1"' . checked( (bool) $value, true, false ) . '>';
		} elseif ( in_array( $key, tac_multiline_fields(), true ) ) {
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

	$fields = tac_tour_fields();
	foreach ( $fields as $key => $def ) {
		$raw = isset( $_POST[ 'tac_' . $key ] ) ? wp_unslash( $_POST[ 'tac_' . $key ] ) : null; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- sanitized by tac_sanitize_field().
		update_post_meta( $post_id, $key, tac_sanitize_field( $key, $def[0], $raw ) );
	}
}
