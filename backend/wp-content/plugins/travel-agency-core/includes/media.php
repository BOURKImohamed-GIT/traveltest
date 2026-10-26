<?php
/**
 * Photos from the WordPress Media Library: the featured image of tours and
 * cities, a gallery picked from Media, and a photo column in the Listings table.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// "Set featured image" needs theme support; turn it on whatever the active theme does.
add_action(
	'after_setup_theme',
	function () {
		add_theme_support( 'post-thumbnails' );
	},
	100
);

/* ---------- Gallery (attachment ids in the `gallery_ids` meta) ---------- */

/**
 * @return int[] Gallery photo ids, in the chosen order.
 */
function tac_gallery_ids( $post_id ) {
	return array_values( array_filter( array_map( 'absint', explode( ',', (string) get_post_meta( $post_id, 'gallery_ids', true ) ) ) ) );
}

/**
 * Gallery photo URLs: Media Library photos first, then any links typed in "Extra gallery image links".
 */
function tac_gallery_urls( $post_id ) {
	$urls = array();
	foreach ( tac_gallery_ids( $post_id ) as $id ) {
		$url = wp_get_attachment_image_url( $id, 'full' );
		if ( $url ) {
			$urls[] = $url;
		}
	}
	return array_merge( $urls, array_map( 'esc_url_raw', tac_lines( get_post_meta( $post_id, 'gallery', true ) ) ) );
}

add_action(
	'add_meta_boxes_tour',
	function () {
		add_meta_box( 'tac_gallery', __( 'Gallery photos', 'travel-agency-core' ), 'tac_render_gallery_box', 'tour', 'side', 'low' );
	}
);

add_action(
	'admin_enqueue_scripts',
	function ( $hook ) {
		if ( in_array( $hook, array( 'post.php', 'post-new.php' ), true ) && 'tour' === get_current_screen()->post_type ) {
			wp_enqueue_media();
		}
	}
);

function tac_render_gallery_box( WP_Post $post ) {
	wp_nonce_field( 'tac_save_gallery', 'tac_gallery_nonce' );
	$ids = tac_gallery_ids( $post->ID );
	?>
	<style>
		#tac-gallery-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 0 0 10px; padding: 0; list-style: none; }
		#tac-gallery-list li { position: relative; margin: 0; aspect-ratio: 1; background: #f0f0f1; }
		#tac-gallery-list img { width: 100%; height: 100%; object-fit: cover; display: block; }
		#tac-gallery-list button { position: absolute; top: 2px; right: 2px; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 50%; background: rgba(0,0,0,.7); color: #fff; cursor: pointer; line-height: 22px; }
	</style>
	<p class="description"><?php esc_html_e( 'Shown after the featured image on the tour page. Pick photos from the Media Library or upload new ones.', 'travel-agency-core' ); ?></p>
	<ul id="tac-gallery-list">
		<?php foreach ( $ids as $id ) : ?>
			<li data-id="<?php echo esc_attr( $id ); ?>">
				<?php echo wp_get_attachment_image( $id, 'thumbnail' ); ?>
				<button type="button" aria-label="<?php esc_attr_e( 'Remove photo', 'travel-agency-core' ); ?>">×</button>
			</li>
		<?php endforeach; ?>
	</ul>
	<input type="hidden" name="tac_gallery_ids" id="tac-gallery-ids" value="<?php echo esc_attr( implode( ',', $ids ) ); ?>">
	<button type="button" class="button" id="tac-gallery-add"><?php esc_html_e( 'Add photos', 'travel-agency-core' ); ?></button>
	<script>
	( function () {
		var list = document.getElementById( 'tac-gallery-list' );
		var field = document.getElementById( 'tac-gallery-ids' );
		var removeLabel = <?php echo wp_json_encode( __( 'Remove photo', 'travel-agency-core' ) ); ?>;
		var frame;

		function sync() {
			field.value = Array.prototype.map.call( list.children, function ( li ) { return li.getAttribute( 'data-id' ); } ).join( ',' );
		}

		document.getElementById( 'tac-gallery-add' ).addEventListener( 'click', function () {
			if ( ! frame ) {
				frame = wp.media( {
					title: <?php echo wp_json_encode( __( 'Add gallery photos', 'travel-agency-core' ) ); ?>,
					button: { text: <?php echo wp_json_encode( __( 'Add to gallery', 'travel-agency-core' ) ); ?> },
					library: { type: 'image' },
					multiple: 'add'
				} );
				frame.on( 'select', function () {
					frame.state().get( 'selection' ).each( function ( att ) {
						var a = att.toJSON();
						if ( list.querySelector( '[data-id="' + a.id + '"]' ) ) return;
						var src = ( a.sizes && ( a.sizes.thumbnail || a.sizes.medium || a.sizes.full ) || {} ).url || a.url;
						var li = document.createElement( 'li' );
						li.setAttribute( 'data-id', a.id );
						li.innerHTML = '<img alt=""><button type="button">×</button>';
						li.querySelector( 'img' ).src = src;
						li.querySelector( 'button' ).setAttribute( 'aria-label', removeLabel );
						list.appendChild( li );
					} );
					sync();
				} );
			}
			frame.open();
		} );

		list.addEventListener( 'click', function ( e ) {
			if ( e.target.tagName === 'BUTTON' ) {
				e.target.closest( 'li' ).remove();
				sync();
			}
		} );
	} )();
	</script>
	<?php
}

add_action(
	'save_post_tour',
	function ( $post_id ) {
		if ( ! isset( $_POST['tac_gallery_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['tac_gallery_nonce'] ), 'tac_save_gallery' ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		$ids = array_filter( array_map( 'absint', explode( ',', sanitize_text_field( wp_unslash( $_POST['tac_gallery_ids'] ?? '' ) ) ) ) );
		update_post_meta( $post_id, 'gallery_ids', implode( ',', $ids ) );
	}
);

/* ---------- Photo column in Listings ---------- */

add_filter(
	'manage_tour_posts_columns',
	function ( $columns ) {
		return array_slice( $columns, 0, 1, true ) + array( 'tac_photo' => __( 'Photo', 'travel-agency-core' ) ) + array_slice( $columns, 1, null, true );
	}
);

add_action(
	'manage_tour_posts_custom_column',
	function ( $column, $post_id ) {
		if ( 'tac_photo' !== $column ) {
			return;
		}
		$url = tac_image_url( $post_id, 'thumbnail' );
		if ( $url ) {
			// Theme-relative demo paths (/images/…) need the theme's app folder.
			if ( 0 === strpos( $url, '/' ) && 0 !== strpos( $url, '//' ) ) {
				$url = get_theme_file_uri( 'app' . $url );
			}
			echo '<img src="' . esc_url( $url ) . '" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:3px">';
		} else {
			echo '—';
		}
	},
	10,
	2
);

add_action(
	'admin_head-edit.php',
	function () {
		if ( 'tour' === get_current_screen()->post_type ) {
			echo '<style>.column-tac_photo{width:72px}</style>';
		}
	}
);

/* ---------- Demo photos ---------- */

/**
 * Add a photo shipped in data/images to the Media Library once, and return its id.
 */
function tac_demo_attachment( $file ) {
	$file = basename( $file );
	$path = TAC_DIR . 'data/images/' . $file;
	if ( ! is_readable( $path ) ) {
		return 0;
	}
	$found = get_posts(
		array(
			'post_type'   => 'attachment',
			'post_status' => 'inherit',
			'numberposts' => 1,
			'fields'      => 'ids',
			'meta_key'    => '_tac_demo_image', // phpcs:ignore WordPress.DB.SlowDBQuery
			'meta_value'  => $file, // phpcs:ignore WordPress.DB.SlowDBQuery
		)
	);
	if ( $found ) {
		return (int) $found[0];
	}
	$upload = wp_upload_bits( $file, null, file_get_contents( $path ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	if ( ! empty( $upload['error'] ) ) {
		return 0;
	}
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$id = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/jpeg',
			'post_title'     => ucwords( str_replace( '-', ' ', pathinfo( $file, PATHINFO_FILENAME ) ) ),
			'post_status'    => 'inherit',
		),
		$upload['file']
	);
	if ( ! $id || is_wp_error( $id ) ) {
		return 0;
	}
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $upload['file'] ) );
	update_post_meta( $id, '_tac_demo_image', $file );
	return (int) $id;
}

/**
 * Demo images given as /images/x.jpg come from data/images; returns 0 for other URLs.
 */
function tac_demo_attachment_for( $url ) {
	return is_string( $url ) && 0 === strpos( $url, '/images/' ) ? tac_demo_attachment( $url ) : 0;
}

/* ---------- Photo for each Listing category (city cards on the home page) ---------- */

function tac_category_image_field( $image_id ) {
	$src = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : '';
	?>
	<div class="tac-term-image">
		<img src="<?php echo esc_url( $src ); ?>" alt="" style="max-width:240px;height:auto;display:<?php echo $src ? 'block' : 'none'; ?>;margin-bottom:8px;border-radius:4px">
		<input type="hidden" name="tac_term_image_id" value="<?php echo esc_attr( $image_id ); ?>">
		<button type="button" class="button tac-term-image-pick"><?php esc_html_e( 'Choose photo', 'travel-agency-core' ); ?></button>
		<button type="button" class="button-link button-link-delete tac-term-image-remove" style="margin-left:8px;display:<?php echo $src ? 'inline' : 'none'; ?>"><?php esc_html_e( 'Remove', 'travel-agency-core' ); ?></button>
		<p class="description"><?php esc_html_e( 'Shown on the home page city cards ("Where does your trip start?"). Without a photo, a tour photo from this category is used.', 'travel-agency-core' ); ?></p>
	</div>
	<script>
	( function () {
		var box = document.currentScript.previousElementSibling, frame;
		var img = box.querySelector( 'img' ), field = box.querySelector( 'input' ), remove = box.querySelector( '.tac-term-image-remove' );
		box.querySelector( '.tac-term-image-pick' ).addEventListener( 'click', function () {
			frame = frame || wp.media( { title: <?php echo wp_json_encode( __( 'Category photo', 'travel-agency-core' ) ); ?>, library: { type: 'image' }, multiple: false } );
			frame.off( 'select' ).on( 'select', function () {
				var a = frame.state().get( 'selection' ).first().toJSON();
				field.value = a.id;
				img.src = ( a.sizes && ( a.sizes.medium || a.sizes.full ) || a ).url;
				img.style.display = 'block';
				remove.style.display = 'inline';
			} );
			frame.open();
		} );
		remove.addEventListener( 'click', function () {
			field.value = '';
			img.style.display = 'none';
			remove.style.display = 'none';
		} );
	} )();
	</script>
	<?php
}

add_action(
	'tour_category_add_form_fields',
	function () {
		wp_enqueue_media();
		echo '<div class="form-field"><label>' . esc_html__( 'Photo', 'travel-agency-core' ) . '</label>';
		tac_category_image_field( 0 );
		echo '</div>';
	}
);

add_action(
	'tour_category_edit_form_fields',
	function ( WP_Term $term ) {
		wp_enqueue_media();
		echo '<tr class="form-field"><th scope="row">' . esc_html__( 'Photo', 'travel-agency-core' ) . '</th><td>';
		tac_category_image_field( (int) get_term_meta( $term->term_id, 'image_id', true ) );
		echo '</td></tr>';
	}
);

foreach ( array( 'created_tour_category', 'edited_tour_category' ) as $tac_hook ) {
	add_action(
		$tac_hook,
		function ( $term_id ) {
			if ( ! isset( $_POST['tac_term_image_id'] ) || ! current_user_can( 'manage_categories' ) ) { // phpcs:ignore WordPress.Security.NonceVerification -- core verifies the term form nonce.
				return;
			}
			$id = absint( $_POST['tac_term_image_id'] ); // phpcs:ignore WordPress.Security.NonceVerification
			if ( $id ) {
				update_term_meta( $term_id, 'image_id', $id );
			} else {
				delete_term_meta( $term_id, 'image_id' );
			}
		}
	);
}
