<?php
/**
 * Demo content: tours, day trips, activities, categories with photos, pages (About Us,
 * FAQs, policies), menus and example Agency details, from data/sample-content.json.
 *
 * Imported automatically the first time the plugin is activated on a site with no tours,
 * or any time from wp-admin → Agency details → Demo content. Safe to re-run: items are
 * matched by slug and updated, published pages and saved Agency details are kept.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @return string[] What was imported, one line per item.
 */
function tac_import_sample_content() {
	$data = json_decode( file_get_contents( TAC_DIR . 'data/sample-content.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	if ( ! is_array( $data ) ) {
		return array( 'Could not read data/sample-content.json.' );
	}
	$log = array();

	// Listings without their own photos get placeholders. Paths like /images/x.jpg are served by the theme.
	$image = function ( $slug ) {
		return 'https://picsum.photos/seed/' . rawurlencode( $slug ) . '/1200/800';
	};

	$upsert = function ( $post_type, $slug, $postarr ) {
		$existing = get_page_by_path( $slug, OBJECT, $post_type );
		$postarr  = array_merge(
			$postarr,
			array(
				'post_type'   => $post_type,
				'post_name'   => $slug,
				'post_status' => 'publish',
			)
		);
		if ( $existing ) {
			$postarr['ID'] = $existing->ID;
		}
		return wp_insert_post( $postarr, true );
	};

	// The 17 categories and their activity types (listing-schema.json), then the
	// "Morocco Tours From <city>" lists from the data file.
	tac_create_category_terms();
	foreach ( $data['categories'] as $cat ) {
		$parent = 0;
		if ( ! empty( $cat['parent'] ) ) {
			$parent_term = get_term_by( 'slug', $cat['parent'], 'tour_category' );
			$parent      = $parent_term ? (int) $parent_term->term_id : 0;
		}
		if ( ! term_exists( $cat['slug'], 'tour_category' ) ) {
			wp_insert_term( $cat['name'], 'tour_category', array( 'slug' => $cat['slug'], 'parent' => $parent ) );
		}
		// City card photo, kept if you already chose one.
		$term  = get_term_by( 'slug', $cat['slug'], 'tour_category' );
		$photo = tac_demo_attachment_for( $cat['image'] ?? '' );
		if ( $term && $photo && ! get_term_meta( $term->term_id, 'image_id', true ) ) {
			update_term_meta( $term->term_id, 'image_id', $photo );
		}
	}

	foreach ( $data['tours'] as $l ) {
		$id = $upsert(
			'tour',
			$l['slug'],
			array(
				'post_title'     => $l['title'],
				'post_content'   => $l['description'],
				'post_excerpt'   => $l['excerpt'],
				'comment_status' => 'open',
				'meta_input'     => array(
					'price'          => $l['price'],
					'currency'       => $l['currency'],
					'price_unit'     => $l['priceUnit'] ?? 'per_person',
					'listing_category' => $l['listingCategory'],
					'listing_subtype'  => $l['subtype'],
					'duration'       => $l['duration'],
					'location'       => $l['location'],
					'free_cancel'    => $l['freeCancel'],
					'group_size'     => $l['groupSize'],
					'languages'      => $l['languages'],
					'start_point'    => $l['startPoint'] ?? '',
					'end_point'      => $l['endPoint'] ?? '',
					'notes'          => implode( "\n", $l['notes'] ?? array() ),
					'meeting_point'  => $l['meetingPoint'],
					'highlights'     => implode( "\n", $l['highlights'] ),
					'itinerary'      => '',
					// JSON, slashed because update_post_meta() unslashes. Details become HTML paragraphs.
					'itinerary_days' => wp_slash(
						wp_json_encode(
							array_map(
								function ( $stop ) {
									return array(
										'title'    => $stop['title'],
										'details'  => wpautop( esc_html( $stop['details'] ) ),
										'distance' => $stop['distance'] ?? '',
									);
								},
								$l['itinerary']
							)
						)
					),
					'included'       => implode( "\n", $l['included'] ),
					'not_included'   => implode( "\n", $l['notIncluded'] ),
					// Shown until a featured image is set (placeholder photos for tours without demo photos).
					'image_url'      => $l['image'] ?? $image( $l['slug'] ),
					'gallery'        => '',
				),
			)
		);
		if ( is_wp_error( $id ) ) {
			$log[] = 'Skipped ' . $l['slug'] . ': ' . $id->get_error_message();
			continue;
		}
		// Demo photos into the Media Library: featured image and gallery (kept if you already chose them).
		$thumb = tac_demo_attachment_for( $l['image'] ?? '' );
		if ( $thumb && ! has_post_thumbnail( $id ) ) {
			set_post_thumbnail( $id, $thumb );
		}
		if ( ! tac_gallery_ids( $id ) ) {
			$gallery_ids = array_filter( array_map( 'tac_demo_attachment_for', array_slice( $l['gallery'] ?? array(), 1 ) ) );
			update_post_meta( $id, 'gallery_ids', implode( ',', $gallery_ids ) );
		}
		// New fields (group type, cancellation, city…) only where empty, so your edits stay.
		foreach ( $l['fields'] ?? array() as $key => $value ) {
			if ( '' === (string) get_post_meta( $id, $key, true ) ) {
				update_post_meta( $id, $key, $value );
			}
		}
		tac_listing_sync( $id );

		if ( ! get_comments( array( 'post_id' => $id, 'count' => true ) ) ) {
			foreach ( $l['reviews'] as $r ) {
				wp_insert_comment(
					array(
						'comment_post_ID'      => $id,
						'comment_author'       => $r['author'],
						'comment_author_email' => sanitize_title( $r['author'] ) . '@example.com',
						'comment_content'      => $r['content'],
						'comment_approved'     => 1,
						'comment_date'         => $r['travelDate'] . '-15 12:00:00',
						'comment_date_gmt'     => $r['travelDate'] . '-15 12:00:00',
						'comment_meta'         => array(
							'rating'      => $r['rating'],
							'title'       => $r['title'],
							'trip_type'   => $r['tripType'],
							'travel_date' => $r['travelDate'],
						),
					)
				);
			}
		}
		tac_recalculate_rating( $id );
		$log[] = "Tour: {$l['title']}";
	}

	// Site pages (About Us, FAQs, policies…). Published pages are left alone so edits made in wp-admin are kept.
	foreach ( $data['pages'] ?? array() as $page ) {
		$existing = get_page_by_path( $page['slug'], OBJECT, 'page' );
		if ( $existing && 'publish' === $existing->post_status ) {
			$log[] = "Page kept (already published): {$page['title']}";
			continue;
		}
		// WordPress creates an unpublished "Privacy Policy" draft on install: fill and publish it.
		$id = wp_insert_post(
			array(
				'ID'           => $existing ? $existing->ID : 0,
				'post_type'    => 'page',
				'post_name'    => $page['slug'],
				'post_title'   => $page['title'],
				'post_content' => $page['content'],
				'post_status'  => 'publish',
			),
			true
		);
		$log[] = is_wp_error( $id ) ? "Page failed: {$page['title']}" : "Page: {$page['title']}";
	}

	// Example Agency details (contact, social links, footer text), only on a site that has none yet.
	if ( ! get_option( TAC_SETTINGS_OPTION ) && ! empty( $data['settings'] ) ) {
		$s = $data['settings'];
		update_option(
			TAC_SETTINGS_OPTION,
			tac_sanitize_settings(
				array_merge(
					$s['contact'] ?? array(),
					array(
						'about'       => $s['about'] ?? '',
						'logo'        => $s['logo'] ?? '',
						'payments'    => implode( ', ', $s['payments'] ?? array() ),
						'show_prices' => $s['showPrices'] ?? true,
						'social'      => $s['social'] ?? array(),
					)
				)
			)
		);
		$log[] = 'Agency details: example contact, social links and payment methods';
	}

	// Main menu, orange tab and footer links (Appearance → Menus).
	$log = array_merge( $log, tac_create_demo_menus() );
	update_option( 'tac_version', TAC_VERSION );

	flush_rewrite_rules();
	return $log;
}

/**
 * Create the 17 categories and their activity types as Listing categories (kept if they exist;
 * the category names follow the schema).
 */
function tac_create_category_terms() {
	foreach ( tac_listing_schema()['categories'] as $cat ) {
		$term = get_term_by( 'slug', $cat['slug'], 'tour_category' );
		if ( ! $term ) {
			$res  = wp_insert_term( $cat['name'], 'tour_category', array( 'slug' => $cat['slug'] ) );
			$term = is_wp_error( $res ) ? null : get_term( $res['term_id'], 'tour_category' );
		} elseif ( $term->name !== $cat['name'] || $term->parent ) {
			wp_update_term( $term->term_id, 'tour_category', array( 'name' => $cat['name'], 'parent' => 0 ) );
		}
		if ( ! $term ) {
			continue;
		}
		foreach ( $cat['subtypes'] as $sub ) {
			$existing = get_term_by( 'slug', $sub['slug'], 'tour_category' );
			if ( ! $existing ) {
				wp_insert_term( $sub['name'], 'tour_category', array( 'slug' => $sub['slug'], 'parent' => (int) $term->term_id ) );
			}
		}
	}
}

/* ---------- Automatic import on first activation ---------- */

add_action( 'init', 'tac_maybe_import_on_activation', 20 );

function tac_maybe_import_on_activation() {
	if ( ! get_option( 'tac_import_pending' ) || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	delete_option( 'tac_import_pending' );
	$tours = get_posts( array( 'post_type' => 'tour', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids' ) );
	if ( ! $tours ) {
		tac_import_sample_content();
		set_transient( 'tac_import_notice', 1, 60 );
	}
}

add_action(
	'admin_notices',
	function () {
		if ( get_transient( 'tac_import_notice' ) ) {
			delete_transient( 'tac_import_notice' );
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Travel Agency Core: the demo tours, pages and agency details were imported. Edit them in Listings, Pages and Agency details.', 'travel-agency-core' ) . '</p></div>';
		}
	}
);

/* ---------- Agency details → Demo content ---------- */

add_action(
	'admin_menu',
	function () {
		add_submenu_page( 'tac-agency', __( 'Demo content', 'travel-agency-core' ), __( 'Demo content', 'travel-agency-core' ), 'manage_options', 'tac-demo', 'tac_render_demo_page' );
	},
	20
);

function tac_render_demo_page() {
	$log = null;
	if ( isset( $_POST['tac_import'] ) && check_admin_referer( 'tac_import_demo' ) ) {
		$log = tac_import_sample_content();
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Demo content', 'travel-agency-core' ); ?></h1>
		<p><?php esc_html_e( 'Imports the demo tours, day trips, activities, category photos, FAQs, About Us and policy pages, and the three menus. Existing demo tours are updated to the original text; your own tours, published pages and saved Agency details are not touched.', 'travel-agency-core' ); ?></p>
		<form method="post">
			<?php wp_nonce_field( 'tac_import_demo' ); ?>
			<?php submit_button( __( 'Import demo content', 'travel-agency-core' ), 'primary', 'tac_import' ); ?>
		</form>
		<?php if ( null !== $log ) : ?>
			<div class="notice notice-success"><p><?php echo esc_html( sprintf( /* translators: %d: number of items */ __( 'Done: %d items imported.', 'travel-agency-core' ), count( $log ) ) ); ?></p></div>
			<ul style="list-style:disc;padding-left:20px">
				<?php foreach ( $log as $line ) : ?>
					<li><?php echo esc_html( $line ); ?></li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
	</div>
	<?php
}

/* ---------- Upgrades for sites that installed an earlier version ---------- */

add_action( 'admin_init', 'tac_maybe_upgrade' );

/**
 * Bring sites that imported the demo with an earlier version up to date, without
 * changing any text you edited. Runs once per version, on an admin page load.
 */
function tac_maybe_upgrade() {
	$version = (string) get_option( 'tac_version', '1.0.0' );
	if ( version_compare( $version, TAC_VERSION, '>=' ) || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	update_option( 'tac_version', TAC_VERSION );
	$tours = get_posts( array( 'post_type' => 'tour', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids' ) );
	if ( ! $tours ) {
		return; // Nothing imported yet: the normal import does everything.
	}
	$data = json_decode( file_get_contents( TAC_DIR . 'data/sample-content.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	if ( ! is_array( $data ) ) {
		return;
	}
	if ( version_compare( $version, '1.1.0', '<' ) ) {
		tac_upgrade_photos_and_menus( $data );
	}
	if ( version_compare( $version, '1.2.0', '<' ) ) {
		tac_upgrade_marketplace( $data );
	}
}

/**
 * 1.1: menus, Media Library photos and category photos.
 */
function tac_upgrade_photos_and_menus( array $data ) {
	foreach ( $data['categories'] as $cat ) {
		$term  = get_term_by( 'slug', $cat['slug'], 'tour_category' );
		$photo = $term ? tac_demo_attachment_for( $cat['image'] ?? '' ) : 0;
		if ( $photo && ! get_term_meta( $term->term_id, 'image_id', true ) ) {
			update_term_meta( $term->term_id, 'image_id', $photo );
		}
	}
	foreach ( $data['tours'] as $l ) {
		$post = get_page_by_path( $l['slug'], OBJECT, 'tour' );
		if ( ! $post ) {
			continue;
		}
		$thumb = tac_demo_attachment_for( $l['image'] ?? '' );
		if ( $thumb && ! has_post_thumbnail( $post->ID ) ) {
			set_post_thumbnail( $post->ID, $thumb );
		}
		if ( ! tac_gallery_ids( $post->ID ) ) {
			$ids = array_filter( array_map( 'tac_demo_attachment_for', array_slice( $l['gallery'] ?? array(), 1 ) ) );
			if ( $ids ) {
				update_post_meta( $post->ID, 'gallery_ids', implode( ',', $ids ) );
				delete_post_meta( $post->ID, 'gallery' ); // The old link list, replaced by the photos above.
			}
		}
	}
	tac_create_demo_menus();
}

/**
 * 1.2: the 17 marketplace categories. Every listing gets a category and activity type
 * (demo listings from the data file, others from their current browse category),
 * old activity categories are removed when empty, and a Marketplace menu becomes the main menu.
 */
function tac_upgrade_marketplace( array $data ) {
	tac_create_category_terms();
	$demo = array();
	foreach ( $data['tours'] as $l ) {
		$demo[ $l['slug'] ] = $l;
	}
	$old_to_new = array(
		'day-trips'           => 'day-trips',
		'quad-and-buggy'      => 'desert-adventures',
		'camel-rides'         => 'desert-adventures',
		'desert-activities'   => 'desert-adventures',
		'hot-air-balloon'     => 'unique-experiences',
		'food-and-culture'    => 'food-culinary',
		'hammam-and-wellness' => 'wellness',
	);
	$legacy_style = array( 'Private' => 'private', 'Shared' => 'small_group' );
	foreach ( get_posts( array( 'post_type' => 'tour', 'post_status' => 'any', 'numberposts' => -1 ) ) as $post ) {
		$l = $demo[ $post->post_name ] ?? null;
		if ( ! tac_listing_category_of( $post->ID ) ) {
			$category = $l['listingCategory'] ?? '';
			if ( ! $category ) {
				foreach ( wp_get_object_terms( $post->ID, 'tour_category', array( 'fields' => 'slugs' ) ) as $slug ) {
					$category = 0 === strpos( $slug, 'tours-from-' ) ? 'tour-packages' : ( $old_to_new[ $slug ] ?? $category );
				}
			}
			if ( $category ) {
				update_post_meta( $post->ID, 'listing_category', $category );
				update_post_meta( $post->ID, 'listing_subtype', $l['subtype'] ?? '' );
			}
		}
		$style = (string) get_post_meta( $post->ID, 'tour_style', true );
		if ( isset( $legacy_style[ $style ] ) ) {
			update_post_meta( $post->ID, 'tour_style', $legacy_style[ $style ] );
		}
		if ( 'per_adult' === get_post_meta( $post->ID, 'price_unit', true ) ) {
			update_post_meta( $post->ID, 'price_unit', 'per_person' );
		}
		foreach ( $l['fields'] ?? array() as $key => $value ) {
			if ( '' === (string) get_post_meta( $post->ID, $key, true ) ) {
				update_post_meta( $post->ID, $key, $value );
			}
		}
		tac_listing_sync( $post->ID );
	}
	foreach ( array_merge( array_keys( $old_to_new ), array( 'activities' ) ) as $slug ) {
		$term = get_term_by( 'slug', $slug, 'tour_category' );
		if ( $term && 'day-trips' !== $slug ) {
			$count = get_posts( array( 'post_type' => 'tour', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids', 'tax_query' => array( array( 'taxonomy' => 'tour_category', 'terms' => $term->term_id ) ) ) ); // phpcs:ignore WordPress.DB.SlowDBQuery
			$kids  = get_terms( array( 'taxonomy' => 'tour_category', 'parent' => $term->term_id, 'hide_empty' => false, 'fields' => 'ids' ) );
			if ( ! $count && ! $kids ) {
				wp_delete_term( $term->term_id, 'tour_category' );
			}
		}
	}
	tac_install_marketplace_menu();
}
