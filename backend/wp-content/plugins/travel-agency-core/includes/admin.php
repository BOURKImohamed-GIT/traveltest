<?php
/**
 * "Listing details" box in wp-admin: category, subtype and every field of the
 * listing's category, built from data/listing-schema.json.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'add_meta_boxes_tour',
	function () {
		add_meta_box( 'tac_tour_details', __( 'Listing details', 'travel-agency-core' ), 'tac_render_listing_box', 'tour', 'normal', 'high' );
	}
);

/**
 * One field as an admin input named tac_f[key]. Rows are edited one per line, columns separated by "|".
 */
function tac_render_admin_field( array $field, $post_id ) {
	$key   = $field['key'];
	$raw   = tac_listing_raw( $post_id, $key );
	$name  = 'tac_f[' . $key . ']';
	$id    = 'tac_' . $key;
	$attrs = ' id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"';
	switch ( $field['type'] ) {
		case 'boolean':
			echo '<input type="hidden" name="' . esc_attr( $name ) . '" value=""><input type="checkbox" value="1"' . $attrs . checked( (bool) $raw, true, false ) . '>'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above.
			break;
		case 'select':
			echo '<select' . $attrs . '><option value="">—</option>'; // phpcs:ignore WordPress.Security.EscapeOutput
			foreach ( $field['options'] as $opt ) {
				echo '<option value="' . esc_attr( $opt['value'] ) . '"' . selected( (string) $raw, $opt['value'], false ) . '>' . esc_html( $opt['label'] ) . '</option>';
			}
			echo '</select>';
			break;
		case 'multiselect':
			$chosen = tac_listing_decode( $field, $raw );
			echo '<input type="hidden" name="' . esc_attr( $name ) . '[]" value="">';
			foreach ( $field['options'] as $opt ) {
				echo '<label style="display:inline-block;margin:0 14px 4px 0"><input type="checkbox" name="' . esc_attr( $name ) . '[]" value="' . esc_attr( $opt['value'] ) . '"' . checked( in_array( $opt['value'], $chosen, true ), true, false ) . '> ' . esc_html( $opt['label'] ) . '</label>';
			}
			break;
		case 'list':
		case 'textarea':
			echo '<textarea class="large-text" rows="' . ( 'list' === $field['type'] ? 4 : 3 ) . '"' . $attrs . '>' . esc_textarea( (string) $raw ) . '</textarea>'; // phpcs:ignore WordPress.Security.EscapeOutput
			break;
		case 'rows':
			$lines = array_map(
				fn( $row ) => implode( ' | ', array_map( fn( $c ) => (string) ( $row[ $c['key'] ] ?? '' ), $field['columns'] ) ),
				tac_listing_decode( $field, $raw )
			);
			echo '<textarea class="large-text" rows="4"' . $attrs . '>' . esc_textarea( implode( "\n", $lines ) ) . '</textarea>'; // phpcs:ignore WordPress.Security.EscapeOutput
			echo '<p class="description">' . esc_html( sprintf( /* translators: %s: column names */ __( 'One per line: %s', 'travel-agency-core' ), implode( ' | ', wp_list_pluck( $field['columns'], 'label' ) ) ) ) . '</p>';
			break;
		default:
			$type = 'number' === $field['type'] ? 'number" step="any' : 'text';
			echo '<input class="regular-text" type="' . $type . '" value="' . esc_attr( (string) $raw ) . '"' . $attrs . ' placeholder="' . esc_attr( $field['placeholder'] ?? '' ) . '">'; // phpcs:ignore WordPress.Security.EscapeOutput
	}
	if ( ! empty( $field['help'] ) && 'rows' !== $field['type'] ) {
		echo '<p class="description">' . esc_html( $field['help'] ) . '</p>';
	}
}

function tac_render_listing_box( WP_Post $post ) {
	wp_nonce_field( 'tac_save_fields', 'tac_fields_nonce' );
	$schema   = tac_listing_schema();
	$category = tac_listing_category_of( $post->ID );
	$subtype  = (string) get_post_meta( $post->ID, 'listing_subtype', true );
	?>
	<table class="form-table">
		<tr>
			<th><label for="tac_listing_category"><?php esc_html_e( 'Category', 'travel-agency-core' ); ?> *</label></th>
			<td>
				<select id="tac_listing_category" name="tac_listing_category">
					<option value="">—</option>
					<?php foreach ( $schema['categories'] as $cat ) : ?>
						<option value="<?php echo esc_attr( $cat['slug'] ); ?>" <?php selected( $category, $cat['slug'] ); ?>><?php echo esc_html( $cat['name'] ); ?></option>
					<?php endforeach; ?>
				</select>
				<p class="description" id="tac-cat-note" style="display:none"><?php esc_html_e( 'Click Update to load the fields of the new category.', 'travel-agency-core' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="tac_listing_subtype"><?php esc_html_e( 'Activity type', 'travel-agency-core' ); ?></label></th>
			<td>
				<select id="tac_listing_subtype" name="tac_listing_subtype">
					<option value="">—</option>
					<?php foreach ( $schema['categories'] as $cat ) : ?>
						<?php foreach ( $cat['subtypes'] as $sub ) : ?>
							<option data-cat="<?php echo esc_attr( $cat['slug'] ); ?>" value="<?php echo esc_attr( $sub['slug'] ); ?>" <?php selected( $subtype, $sub['slug'] ); ?>><?php echo esc_html( $sub['name'] ); ?></option>
						<?php endforeach; ?>
					<?php endforeach; ?>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="tac_hide_price"><?php esc_html_e( 'Hide price', 'travel-agency-core' ); ?></label></th>
			<td><label><input type="checkbox" id="tac_hide_price" name="tac_hide_price" value="1" <?php checked( (bool) get_post_meta( $post->ID, 'hide_price', true ) ); ?>> <?php esc_html_e( 'Show "Price on request" instead of the price', 'travel-agency-core' ); ?></label></td>
		</tr>
	</table>
	<?php if ( ! $category ) : ?>
		<p><strong><?php esc_html_e( 'Choose a category and click Update to see its fields.', 'travel-agency-core' ); ?></strong></p>
		<?php
	else :
		foreach ( tac_listing_sections( $category ) as $sec ) :
			// Itinerary and the short summary have their own boxes (Itinerary, Excerpt).
			$fields = array_filter( $sec['fields'], fn( $f ) => 'itinerary' !== $f['type'] && 'excerpt' !== $f['key'] );
			if ( ! $fields ) {
				continue;
			}
			?>
			<h3 style="margin:24px 0 0;padding-top:12px;border-top:1px solid #dcdcde"><?php echo esc_html( $sec['title'] ); ?></h3>
			<table class="form-table">
				<?php foreach ( $fields as $field ) : ?>
					<tr data-show-if="<?php echo esc_attr( empty( $field['show_if'] ) ? '' : wp_json_encode( $field['show_if'] ) ); ?>">
						<th><label for="tac_<?php echo esc_attr( $field['key'] ); ?>"><?php echo esc_html( $field['label'] . ( $field['required'] ? ' *' : '' ) ); ?></label></th>
						<td><?php tac_render_admin_field( $field, $post->ID ); ?></td>
					</tr>
				<?php endforeach; ?>
			</table>
			<?php
		endforeach;
		$missing = tac_listing_missing( $post->ID );
		if ( $missing ) :
			?>
			<div class="notice notice-warning inline"><p><?php echo esc_html( __( 'Missing before publishing:', 'travel-agency-core' ) . ' ' . implode( ', ', wp_list_pluck( $missing, 'label' ) ) ); ?></p></div>
			<?php
		endif;
	endif;
	?>
	<p class="description">* <?php esc_html_e( 'Required', 'travel-agency-core' ); ?></p>
	<script>
	( function () {
		var cat = document.getElementById( 'tac_listing_category' ), sub = document.getElementById( 'tac_listing_subtype' );
		var initial = cat.value;
		function filterSubtypes() {
			Array.prototype.forEach.call( sub.options, function ( o ) {
				if ( o.value ) o.hidden = o.getAttribute( 'data-cat' ) !== cat.value;
			} );
			if ( sub.selectedOptions[0] && sub.selectedOptions[0].hidden ) sub.value = '';
		}
		cat.addEventListener( 'change', function () {
			filterSubtypes();
			document.getElementById( 'tac-cat-note' ).style.display = cat.value !== initial ? 'block' : 'none';
		} );
		filterSubtypes();
		// Conditional fields.
		var rows = document.querySelectorAll( '#tac_tour_details tr[data-show-if]' );
		function valueOf( key ) {
			var el = document.getElementById( 'tac_' + key );
			return ! el ? '' : el.type === 'checkbox' ? ( el.checked ? '1' : '' ) : el.value;
		}
		function update() {
			rows.forEach( function ( row ) {
				var c = row.getAttribute( 'data-show-if' );
				if ( ! c ) return;
				c = JSON.parse( c );
				var v = valueOf( c.field );
				row.style.display = ( c.in ? c.in.indexOf( v ) >= 0 : ( c.not_in || [] ).indexOf( v ) < 0 ) ? '' : 'none';
			} );
		}
		document.getElementById( 'tac_tour_details' ).addEventListener( 'change', update );
		update();
	} )();
	</script>
	<?php
}

add_action( 'save_post_tour', 'tac_save_listing_box', 10, 2 );

function tac_save_listing_box( $post_id, $post ) {
	if ( ! isset( $_POST['tac_fields_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['tac_fields_nonce'] ), 'tac_save_fields' ) ) {
		return;
	}
	if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	$old_category = tac_listing_category_of( $post_id );
	$category     = sanitize_title( wp_unslash( $_POST['tac_listing_category'] ?? '' ) );
	if ( tac_listing_category( $category ) ) {
		update_post_meta( $post_id, 'listing_category', $category );
	}
	update_post_meta( $post_id, 'listing_subtype', sanitize_title( wp_unslash( $_POST['tac_listing_subtype'] ?? '' ) ) );
	update_post_meta( $post_id, 'hide_price', empty( $_POST['tac_hide_price'] ) ? '' : '1' );

	// Fields shown on this screen belonged to the category it was opened with.
	$input  = isset( $_POST['tac_f'] ) && is_array( $_POST['tac_f'] ) ? wp_unslash( $_POST['tac_f'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- sanitized per field type.
	$fields = tac_listing_fields( $old_category ? $old_category : $category );
	foreach ( $input as $key => $value ) {
		if ( isset( $fields[ $key ] ) && 'rows' === $fields[ $key ]['type'] && is_string( $value ) ) {
			$cols          = wp_list_pluck( $fields[ $key ]['columns'], 'key' );
			$input[ $key ] = array_map(
				fn( $line ) => array_combine( $cols, array_pad( array_slice( array_map( 'trim', explode( '|', $line ) ), 0, count( $cols ) ), count( $cols ), '' ) ),
				tac_lines( $value )
			);
		}
	}
	tac_listing_save( $post_id, $old_category ? $old_category : $category, $input );
}
