<?php
/**
 * Day-by-day itinerary: a title, a description written with the WordPress text
 * editor, and the driving distance/time for each day.
 *
 * Stored as JSON in the `itinerary_days` meta. Tours saved before this editor kept
 * one day per line ("Title | details | distance") in `itinerary`; they are read
 * from there until saved again.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @return array<int, array{title: string, details: string, distance: string}> Details are HTML.
 *
 * Details keep the editor's raw text (paragraphs as blank lines) in the meta box;
 * use $for_display = true for HTML with <p> tags.
 */
function tac_get_itinerary( $post_id, $for_display = false ) {
	$json = get_post_meta( $post_id, 'itinerary_days', true );
	if ( $json ) {
		$days = json_decode( $json, true );
		if ( is_array( $days ) ) {
			return array_values(
				array_map(
					function ( $d ) use ( $for_display ) {
						$details = wp_kses_post( (string) ( $d['details'] ?? '' ) );
						return array(
							'title'    => (string) ( $d['title'] ?? '' ),
							// The text editor saves paragraphs as blank lines, like post content.
							'details'  => $for_display ? wpautop( $details ) : $details,
							'distance' => (string) ( $d['distance'] ?? '' ),
						);
					},
					array_filter( $days, 'is_array' )
				)
			);
		}
	}
	// Older format: one day per line.
	return array_map(
		function ( $line ) {
			$parts = array_map( 'trim', explode( '|', $line, 3 ) );
			return array(
				'title'    => $parts[0],
				'details'  => isset( $parts[1] ) && '' !== $parts[1] ? wpautop( esc_html( $parts[1] ) ) : '',
				'distance' => $parts[2] ?? '',
			);
		},
		tac_lines( get_post_meta( $post_id, 'itinerary', true ) )
	);
}

/**
 * Save days (title, HTML details, distance) as the itinerary of a tour.
 */
function tac_set_itinerary( $post_id, array $days ) {
	$clean = array();
	foreach ( $days as $d ) {
		$day = array(
			'title'    => sanitize_text_field( $d['title'] ?? '' ),
			'details'  => wp_kses_post( trim( (string) ( $d['details'] ?? '' ) ) ),
			'distance' => sanitize_text_field( $d['distance'] ?? '' ),
		);
		if ( '' !== $day['title'] || '' !== wp_strip_all_tags( $day['details'] ) ) {
			$clean[] = $day;
		}
	}
	update_post_meta( $post_id, 'itinerary_days', wp_slash( wp_json_encode( $clean ) ) );
	delete_post_meta( $post_id, 'itinerary' );
}

/* ---------- Classic editor for tours, so the detail boxes sit under the description ---------- */

add_filter(
	'use_block_editor_for_post_type',
	function ( $use, $post_type ) {
		return 'tour' === $post_type ? false : $use;
	},
	10,
	2
);

/* ---------- Meta box ---------- */

add_action(
	'add_meta_boxes_tour',
	function () {
		add_meta_box( 'tac_itinerary', __( 'Itinerary (day by day)', 'travel-agency-core' ), 'tac_render_itinerary_box', 'tour', 'normal', 'high' );
	}
);

add_action(
	'admin_enqueue_scripts',
	function ( $hook ) {
		if ( in_array( $hook, array( 'post.php', 'post-new.php' ), true ) && 'tour' === get_current_screen()->post_type ) {
			wp_enqueue_editor();
		}
	}
);

/** Editor ids may only contain lowercase letters: 0 → "a", 27 → "bb"… */
function tac_itinerary_key( $n ) {
	$key = '';
	do {
		$key = chr( 97 + $n % 26 ) . $key;
		$n   = intdiv( $n, 26 ) - 1;
	} while ( $n >= 0 );
	return $key;
}

function tac_itinerary_editor_settings() {
	return array(
		'textarea_rows' => 6,
		'media_buttons' => false,
		'teeny'         => false,
		'quicktags'     => true,
		'tinymce'       => array(
			'toolbar1' => 'formatselect,bold,italic,bullist,numlist,link,unlink,undo,redo',
			'toolbar2' => '',
		),
	);
}

function tac_itinerary_row( $key, $number, $day ) {
	$name = 'tac_itinerary[' . $key . ']';
	?>
	<div class="tac-day" data-key="<?php echo esc_attr( $key ); ?>">
		<div class="tac-day-head">
			<strong class="tac-day-number"><?php echo esc_html( sprintf( /* translators: %d: day number */ __( 'Day %d', 'travel-agency-core' ), $number ) ); ?></strong>
			<button type="button" class="button-link button-link-delete tac-day-remove"><?php esc_html_e( 'Remove this day', 'travel-agency-core' ); ?></button>
		</div>
		<p>
			<label><?php esc_html_e( 'Title', 'travel-agency-core' ); ?><br>
				<input type="text" class="large-text" name="<?php echo esc_attr( $name ); ?>[title]" value="<?php echo esc_attr( $day['title'] ); ?>" placeholder="<?php esc_attr_e( 'Day 1: Marrakech → High Atlas → Dadès Gorge', 'travel-agency-core' ); ?>">
			</label>
		</p>
		<p class="tac-day-label"><?php esc_html_e( 'Description', 'travel-agency-core' ); ?></p>
		<?php
		wp_editor(
			$day['details'],
			'tacitin' . $key,
			array_merge( tac_itinerary_editor_settings(), array( 'textarea_name' => $name . '[details]' ) )
		);
		?>
		<p>
			<label><?php esc_html_e( 'Driving distance/time (optional)', 'travel-agency-core' ); ?><br>
				<input type="text" class="regular-text" name="<?php echo esc_attr( $name ); ?>[distance]" value="<?php echo esc_attr( $day['distance'] ); ?>" placeholder="<?php esc_attr_e( 'About 353 km / 6 h 30 min', 'travel-agency-core' ); ?>">
			</label>
		</p>
	</div>
	<?php
}

function tac_render_itinerary_box( WP_Post $post ) {
	wp_nonce_field( 'tac_save_itinerary', 'tac_itinerary_nonce' );
	$days = tac_get_itinerary( $post->ID );
	?>
	<style>
		.tac-day { border: 1px solid #dcdcde; border-radius: 4px; padding: 12px 14px; margin: 0 0 14px; background: #fff; }
		.tac-day-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
		.tac-day-number { font-size: 14px; }
		.tac-day-label { margin: 8px 0 4px; }
	</style>
	<p class="description"><?php esc_html_e( 'One block per day. Write the description with the text editor: paragraphs, bold, lists and links are kept on the tour page.', 'travel-agency-core' ); ?></p>
	<div id="tac-days">
		<?php
		foreach ( $days as $i => $day ) {
			tac_itinerary_row( tac_itinerary_key( $i ), $i + 1, $day );
		}
		?>
	</div>
	<p><button type="button" class="button button-secondary" id="tac-day-add">+ <?php esc_html_e( 'Add day', 'travel-agency-core' ); ?></button></p>

	<script type="text/html" id="tmpl-tac-day">
		<div class="tac-day" data-key="__KEY__">
			<div class="tac-day-head">
				<strong class="tac-day-number"></strong>
				<button type="button" class="button-link button-link-delete tac-day-remove"><?php esc_html_e( 'Remove this day', 'travel-agency-core' ); ?></button>
			</div>
			<p><label><?php esc_html_e( 'Title', 'travel-agency-core' ); ?><br><input type="text" class="large-text" name="tac_itinerary[__KEY__][title]" placeholder="<?php esc_attr_e( 'Day 1: Marrakech → High Atlas → Dadès Gorge', 'travel-agency-core' ); ?>"></label></p>
			<p class="tac-day-label"><?php esc_html_e( 'Description', 'travel-agency-core' ); ?></p>
			<textarea class="wp-editor-area" rows="6" id="tacitin__KEY__" name="tac_itinerary[__KEY__][details]"></textarea>
			<p><label><?php esc_html_e( 'Driving distance/time (optional)', 'travel-agency-core' ); ?><br><input type="text" class="regular-text" name="tac_itinerary[__KEY__][distance]" placeholder="<?php esc_attr_e( 'About 353 km / 6 h 30 min', 'travel-agency-core' ); ?>"></label></p>
		</div>
	</script>
	<script>
	( function () {
		var list = document.getElementById( 'tac-days' );
		var settings = <?php echo wp_json_encode( array( 'tinymce' => array( 'wpautop' => true, 'toolbar1' => 'formatselect,bold,italic,bullist,numlist,link,unlink,undo,redo', 'toolbar2' => '' ), 'quicktags' => true, 'mediaButtons' => false ) ); ?>;
		var dayLabel = <?php echo wp_json_encode( __( 'Day %d', 'travel-agency-core' ) ); ?>;
		var counter = 0;

		function renumber() {
			list.querySelectorAll( '.tac-day-number' ).forEach( function ( el, i ) {
				el.textContent = dayLabel.replace( '%d', i + 1 );
			} );
		}
		// Editor ids may only contain lowercase letters.
		function newKey() {
			var n = counter++, key = '';
			do { key = String.fromCharCode( 97 + ( n % 26 ) ) + key; n = Math.floor( n / 26 ) - 1; } while ( n >= 0 );
			return 'new' + key;
		}

		document.getElementById( 'tac-day-add' ).addEventListener( 'click', function () {
			var key = newKey();
			var html = document.getElementById( 'tmpl-tac-day' ).innerHTML.replace( /__KEY__/g, key );
			list.insertAdjacentHTML( 'beforeend', html );
			renumber();
			if ( window.wp && wp.editor && wp.editor.initialize ) {
				wp.editor.initialize( 'tacitin' + key, settings );
			}
			list.lastElementChild.querySelector( 'input' ).focus();
		} );

		list.addEventListener( 'click', function ( e ) {
			var btn = e.target.closest( '.tac-day-remove' );
			if ( ! btn ) return;
			var row = btn.closest( '.tac-day' );
			var title = row.querySelector( 'input' ).value;
			if ( title && ! window.confirm( <?php echo wp_json_encode( __( 'Remove this day?', 'travel-agency-core' ) ); ?> ) ) return;
			var editorId = 'tacitin' + row.getAttribute( 'data-key' );
			if ( window.wp && wp.editor && wp.editor.remove ) {
				wp.editor.remove( editorId );
			}
			row.remove();
			renumber();
		} );
	} )();
	</script>
	<?php
}

add_action(
	'save_post_tour',
	function ( $post_id ) {
		if ( ! isset( $_POST['tac_itinerary_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['tac_itinerary_nonce'] ), 'tac_save_itinerary' ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		// Rows arrive in page order; sanitized in tac_set_itinerary().
		$days = isset( $_POST['tac_itinerary'] ) && is_array( $_POST['tac_itinerary'] ) ? wp_unslash( $_POST['tac_itinerary'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		tac_set_itinerary( $post_id, array_values( array_filter( $days, 'is_array' ) ) );
	}
);
