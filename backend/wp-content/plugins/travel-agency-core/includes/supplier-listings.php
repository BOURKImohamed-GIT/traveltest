<?php
/**
 * Suppliers' listings: create (draft), edit with the schema fields, photos, preview,
 * submit for review (or publish directly when the site allows it), archive, duplicate.
 *
 * Statuses: draft → pending (submitted) → publish; archived (hidden, kept).
 * Admins review pending listings in wp-admin and publish them or send them back.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'init',
	function () {
		register_post_status(
			'archived',
			array(
				'label'                     => _x( 'Archived', 'listing status', 'travel-agency-core' ),
				'public'                    => false,
				'exclude_from_search'       => true,
				'show_in_admin_all_list'    => false,
				'show_in_admin_status_list' => true,
				/* translators: %s: number of listings */
				'label_count'               => _n_noop( 'Archived <span class="count">(%s)</span>', 'Archived <span class="count">(%s)</span>', 'travel-agency-core' ),
			)
		);
	}
);

/** Supplier listings need an admin's approval unless switched off in Agency details. */
function tac_listings_need_review() {
	return (bool) ( tac_settings()['review_listings'] ?? true );
}

/**
 * The listing, if this user may edit it.
 *
 * @return WP_Post|WP_Error
 */
function tac_supplier_listing( $id, $user_id ) {
	$post = get_post( (int) $id );
	if ( ! $post || 'tour' !== $post->post_type || 'trash' === $post->post_status ) {
		return new WP_Error( 'not_found', __( 'Listing not found.', 'travel-agency-core' ), array( 'status' => 404 ) );
	}
	if ( (int) $post->post_author !== (int) $user_id && ! user_can( $user_id, 'edit_others_posts' ) ) {
		return new WP_Error( 'forbidden', __( 'This is not your listing.', 'travel-agency-core' ), array( 'status' => 403 ) );
	}
	return $post;
}

function tac_photo( $id ) {
	$id = (int) $id;
	return $id && wp_attachment_is_image( $id ) ? array(
		'id'    => $id,
		'url'   => wp_get_attachment_image_url( $id, 'large' ),
		'thumb' => wp_get_attachment_image_url( $id, 'medium' ),
	) : null;
}

/**
 * Row in "My listings".
 */
function tac_format_supplier_listing_row( WP_Post $post ) {
	$cat = tac_listing_category( tac_listing_category_of( $post->ID ) );
	return array(
		'id'        => $post->ID,
		'slug'      => $post->post_name,
		'title'     => tac_text( $post->post_title ),
		'status'    => $post->post_status,
		'category'  => $cat ? $cat['name'] : '',
		'image'     => tac_image_url( $post->ID, 'medium' ),
		'updated'   => get_post_datetime( $post, 'modified' )->format( DATE_RFC3339 ),
		'missing'   => count( tac_listing_missing( $post->ID ) ),
		'views'     => (int) get_post_meta( $post->ID, 'views', true ),
		'inquiries' => count( tac_inquiries( array( array( 'key' => 'tour_id', 'value' => $post->ID, 'type' => 'NUMERIC' ) ) ) ),
		'note'      => (string) get_post_meta( $post->ID, 'review_note', true ),
	);
}

/**
 * Everything the wizard needs to edit a listing.
 */
function tac_format_supplier_listing( WP_Post $post ) {
	$category = tac_listing_category_of( $post->ID );
	$values   = tac_listing_values( $post->ID );
	foreach ( tac_listing_fields( $category ) as $key => $field ) {
		if ( 'itinerary' === $field['type'] ) {
			$values[ $key ] = tac_get_itinerary( $post->ID );
		}
	}
	return array(
		'id'          => $post->ID,
		'slug'        => $post->post_name,
		'status'      => $post->post_status,
		'title'       => $post->post_title,
		'description' => $post->post_content,
		'category'    => $category,
		'subtype'     => (string) get_post_meta( $post->ID, 'listing_subtype', true ),
		'values'      => $values,
		'cover'       => tac_photo( get_post_thumbnail_id( $post->ID ) ),
		'gallery'     => array_values( array_filter( array_map( 'tac_photo', tac_gallery_ids( $post->ID ) ) ) ),
		'missing'     => tac_listing_missing( $post->ID ),
		'note'        => (string) get_post_meta( $post->ID, 'review_note', true ),
		'needsReview' => tac_listings_need_review() && ! user_can( (int) $post->post_author, 'edit_others_posts' ),
		'preview'     => tac_format_tour( $post, true ),
	);
}

/**
 * A photo id the user may attach: their own upload (admins: any image).
 */
function tac_allowed_photo( $id, $user_id ) {
	$att = get_post( (int) $id );
	return $att && 'attachment' === $att->post_type && wp_attachment_is_image( $att->ID )
		&& ( (int) $att->post_author === (int) $user_id || user_can( $user_id, 'edit_others_posts' ) );
}

/**
 * Apply an edit from the wizard.
 */
function tac_update_supplier_listing( WP_Post $post, array $in, $user_id ) {
	$update = array( 'ID' => $post->ID );
	if ( isset( $in['title'] ) ) {
		$update['post_title'] = sanitize_text_field( $in['title'] );
	}
	if ( isset( $in['description'] ) ) {
		$update['post_content'] = wp_kses_post( $in['description'] );
	}
	if ( count( $update ) > 1 ) {
		wp_update_post( wp_slash( $update ) );
	}
	if ( isset( $in['category'] ) && tac_listing_category( $in['category'] ) ) {
		update_post_meta( $post->ID, 'listing_category', $in['category'] );
	}
	$category = tac_listing_category_of( $post->ID );
	if ( isset( $in['subtype'] ) ) {
		$valid = $category ? wp_list_pluck( tac_listing_category( $category )['subtypes'], 'slug' ) : array();
		update_post_meta( $post->ID, 'listing_subtype', in_array( $in['subtype'], $valid, true ) ? $in['subtype'] : '' );
	}
	if ( isset( $in['values'] ) && is_array( $in['values'] ) && $category ) {
		tac_listing_save( $post->ID, $category, $in['values'] );
	} else {
		tac_listing_sync( $post->ID );
	}
	if ( array_key_exists( 'coverId', $in ) ) {
		if ( $in['coverId'] && tac_allowed_photo( $in['coverId'], $user_id ) ) {
			set_post_thumbnail( $post->ID, (int) $in['coverId'] );
			delete_post_meta( $post->ID, 'image_url' );
		} elseif ( ! $in['coverId'] ) {
			delete_post_thumbnail( $post->ID );
		}
	}
	if ( isset( $in['galleryIds'] ) && is_array( $in['galleryIds'] ) ) {
		$ids = array_values( array_filter( array_map( 'absint', $in['galleryIds'] ), fn( $id ) => tac_allowed_photo( $id, $user_id ) ) );
		update_post_meta( $post->ID, 'gallery_ids', implode( ',', array_slice( $ids, 0, 30 ) ) );
	}
	// Changing a live listing sends it back for review when reviews are on.
	$post = get_post( $post->ID );
	if ( 'publish' === $post->post_status && tac_listings_need_review() && ! user_can( $user_id, 'edit_others_posts' ) ) {
		wp_update_post( array( 'ID' => $post->ID, 'post_status' => 'pending' ) );
		// WordPress clears the slug of pending posts by users who can't publish; keep it so the link survives.
		global $wpdb;
		$wpdb->update( $wpdb->posts, array( 'post_name' => $post->post_name ), array( 'ID' => $post->ID ) );
		clean_post_cache( $post->ID );
		tac_notify_listing_submitted( $post->ID, true );
	}
}

function tac_notify_listing_submitted( $post_id, $changed = false ) {
	$post   = get_post( $post_id );
	$author = get_userdata( (int) $post->post_author );
	wp_mail(
		get_option( 'admin_email' ),
		sprintf( $changed ? '[%s] Listing changed, review again: %s' : '[%s] New listing to review: %s', tac_site_name(), $post->post_title ),
		sprintf(
			"%s %s \"%s\".\n\nReview it, then Publish or send it back with a note: %s",
			$author ? $author->display_name : '',
			$changed ? 'changed' : 'submitted',
			$post->post_title,
			admin_url( 'post.php?action=edit&post=' . $post_id )
		)
	);
}

add_action( 'rest_api_init', 'tac_register_supplier_listing_routes' );

function tac_register_supplier_listing_routes() {
	$ns  = 'travel/v1';
	$own = function ( WP_REST_Request $req ) {
		return tac_supplier_listing( $req['id'], $req['_tac_user'] );
	};

	register_rest_route(
		$ns,
		'/supplier/listings',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function ( WP_REST_Request $req ) {
					$posts = get_posts(
						array(
							'post_type'   => 'tour',
							'post_status' => array( 'draft', 'pending', 'publish', 'archived' ),
							'author'      => $req['_tac_user'],
							'numberposts' => 200,
							'orderby'     => 'modified',
						)
					);
					return array_map( 'tac_format_supplier_listing_row', $posts );
				},
				'permission_callback' => 'tac_require_supplier',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => function ( WP_REST_Request $req ) {
					if ( tac_throttled( 'create_' . $req['_tac_user'], 50, DAY_IN_SECONDS ) ) {
						return new WP_Error( 'too_many_requests', __( 'Too many new listings today.', 'travel-agency-core' ), array( 'status' => 429 ) );
					}
					$category = (string) $req['category'];
					if ( ! tac_listing_category( $category ) ) {
						return new WP_Error( 'bad_category', __( 'Choose a category.', 'travel-agency-core' ), array( 'status' => 400 ) );
					}
					$id = wp_insert_post(
						array(
							'post_type'      => 'tour',
							'post_status'    => 'draft',
							'post_title'     => sanitize_text_field( (string) $req['title'] ),
							'post_author'    => $req['_tac_user'],
							'comment_status' => 'open',
						),
						true
					);
					if ( is_wp_error( $id ) ) {
						return $id;
					}
					update_post_meta( $id, 'listing_category', $category );
					// Sensible defaults, all editable in the wizard.
					tac_listing_save(
						$id,
						$category,
						array(
							'currency'            => 'EUR',
							'price_unit'          => 'per_person',
							'booking_type'        => 'request',
							'cancellation_policy' => 'free_24h',
						)
					);
					tac_update_supplier_listing( get_post( $id ), array( 'subtype' => (string) $req['subtype'] ), $req['_tac_user'] );
					return new WP_REST_Response( tac_format_supplier_listing( get_post( $id ) ), 201 );
				},
				'permission_callback' => 'tac_require_supplier',
				'args'                => array(
					'category' => array( 'type' => 'string', 'required' => true ),
					'subtype'  => array( 'type' => 'string', 'default' => '' ),
					'title'    => array( 'type' => 'string', 'default' => '' ),
				),
			),
		)
	);

	register_rest_route(
		$ns,
		'/supplier/listings/(?P<id>\d+)',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function ( WP_REST_Request $req ) use ( $own ) {
					$post = $own( $req );
					return is_wp_error( $post ) ? $post : tac_format_supplier_listing( $post );
				},
				'permission_callback' => 'tac_require_supplier',
			),
			array(
				'methods'             => 'PUT',
				'callback'            => function ( WP_REST_Request $req ) use ( $own ) {
					$post = $own( $req );
					if ( is_wp_error( $post ) ) {
						return $post;
					}
					if ( 'archived' === $post->post_status ) {
						return new WP_Error( 'archived', __( 'Restore this listing before editing it.', 'travel-agency-core' ), array( 'status' => 409 ) );
					}
					tac_update_supplier_listing( $post, (array) $req->get_json_params(), $req['_tac_user'] );
					return tac_format_supplier_listing( get_post( $post->ID ) );
				},
				'permission_callback' => 'tac_require_supplier',
			),
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => function ( WP_REST_Request $req ) use ( $own ) {
					$post = $own( $req );
					if ( is_wp_error( $post ) ) {
						return $post;
					}
					if ( ! in_array( $post->post_status, array( 'draft', 'archived' ), true ) ) {
						return new WP_Error( 'not_draft', __( 'Only drafts and archived listings can be deleted. Archive it first.', 'travel-agency-core' ), array( 'status' => 409 ) );
					}
					wp_trash_post( $post->ID );
					return array( 'deleted' => true );
				},
				'permission_callback' => 'tac_require_supplier',
			),
		)
	);

	$action = function ( $path, $handler ) use ( $ns, $own ) {
		register_rest_route(
			$ns,
			'/supplier/listings/(?P<id>\d+)/' . $path,
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => function ( WP_REST_Request $req ) use ( $own, $handler ) {
					$post = $own( $req );
					if ( is_wp_error( $post ) ) {
						return $post;
					}
					$result = $handler( $post, $req['_tac_user'] );
					return is_wp_error( $result ) ? $result : tac_format_supplier_listing( get_post( $result ) );
				},
				'permission_callback' => 'tac_require_supplier',
			)
		);
	};

	$action(
		'submit',
		function ( WP_Post $post, $user_id ) {
			$missing = tac_listing_missing( $post->ID );
			if ( $missing ) {
				return new WP_Error( 'incomplete', __( 'Some required information is missing:', 'travel-agency-core' ) . ' ' . implode( ', ', wp_list_pluck( $missing, 'label' ) ), array( 'status' => 400 ) );
			}
			$direct = ! tac_listings_need_review() || user_can( $user_id, 'edit_others_posts' );
			wp_update_post( array( 'ID' => $post->ID, 'post_status' => $direct ? 'publish' : 'pending' ) );
			delete_post_meta( $post->ID, 'review_note' );
			if ( ! $direct ) {
				tac_notify_listing_submitted( $post->ID );
			}
			return $post->ID;
		}
	);

	$action(
		'archive',
		function ( WP_Post $post ) {
			wp_update_post( array( 'ID' => $post->ID, 'post_status' => 'archived' ) );
			return $post->ID;
		}
	);

	$action(
		'restore',
		function ( WP_Post $post ) {
			wp_update_post( array( 'ID' => $post->ID, 'post_status' => 'draft' ) );
			return $post->ID;
		}
	);

	$action(
		'duplicate',
		function ( WP_Post $post, $user_id ) {
			$id = wp_insert_post(
				wp_slash(
					array(
						'post_type'      => 'tour',
						'post_status'    => 'draft',
						/* translators: %s: listing title */
						'post_title'     => sprintf( __( 'Copy of %s', 'travel-agency-core' ), $post->post_title ),
						'post_content'   => $post->post_content,
						'post_excerpt'   => $post->post_excerpt,
						'post_author'    => $post->post_author,
						'comment_status' => 'open',
					)
				),
				true
			);
			if ( is_wp_error( $id ) ) {
				return $id;
			}
			$skip = array( '_edit_lock', '_edit_last', 'views', 'rating', 'review_count', 'review_note', '_wp_old_slug' );
			foreach ( get_post_meta( $post->ID ) as $key => $values ) {
				if ( ! in_array( $key, $skip, true ) ) {
					update_post_meta( $id, $key, wp_slash( maybe_unserialize( $values[0] ) ) );
				}
			}
			tac_listing_sync( $id );
			return $id;
		}
	);
}

/* ---------- Views (Performance) ---------- */

add_filter(
	'rest_post_dispatch',
	function ( $response, $server, $request ) {
		if ( 'GET' === $request->get_method() && preg_match( '#^/travel/v1/tours/[a-z0-9-]+$#', $request->get_route() ) && ! is_wp_error( $response ) && 200 === $response->get_status() ) {
			$data = $response->get_data();
			if ( ! empty( $data['id'] ) ) {
				update_post_meta( $data['id'], 'views', (int) get_post_meta( $data['id'], 'views', true ) + 1 );
			}
		}
		return $response;
	},
	10,
	3
);

/* ---------- wp-admin review ---------- */

add_action(
	'add_meta_boxes_tour',
	function ( WP_Post $post ) {
		if ( user_can( (int) $post->post_author, 'edit_others_posts' ) ) {
			return; // The site's own listing.
		}
		add_meta_box( 'tac_review', __( 'Supplier listing review', 'travel-agency-core' ), 'tac_render_review_box', 'tour', 'side', 'high' );
	}
);

function tac_render_review_box( WP_Post $post ) {
	wp_nonce_field( 'tac_review', 'tac_review_nonce' );
	$author  = get_userdata( (int) $post->post_author );
	$missing = tac_listing_missing( $post->ID );
	?>
	<p>
		<strong><?php echo esc_html( $author ? $author->display_name : '—' ); ?></strong><br>
		<?php echo esc_html( sprintf( /* translators: %s: verification status */ __( 'Verification: %s', 'travel-agency-core' ), $author ? tac_supplier_status( $author->ID ) : '—' ) ); ?>
		· <a href="<?php echo esc_url( admin_url( 'user-edit.php?user_id=' . ( $author ? $author->ID : 0 ) . '#tac-supplier' ) ); ?>"><?php esc_html_e( 'Profile', 'travel-agency-core' ); ?></a>
	</p>
	<?php if ( $missing ) : ?>
		<p style="color:#b32d2e"><?php echo esc_html( __( 'Missing:', 'travel-agency-core' ) . ' ' . implode( ', ', wp_list_pluck( $missing, 'label' ) ) ); ?></p>
	<?php endif; ?>
	<p><?php esc_html_e( 'Check completeness, quality and any verification the activity needs. Then click Publish, or send it back:', 'travel-agency-core' ); ?></p>
	<p><textarea name="tac_review_note" rows="3" style="width:100%" placeholder="<?php esc_attr_e( 'What should the supplier change?', 'travel-agency-core' ); ?>"><?php echo esc_textarea( (string) get_post_meta( $post->ID, 'review_note', true ) ); ?></textarea></p>
	<p><label><input type="checkbox" name="tac_send_back" value="1"> <?php esc_html_e( 'Send back to the supplier as a draft (emails the note)', 'travel-agency-core' ); ?></label></p>
	<?php
}

add_action(
	'save_post_tour',
	function ( $post_id ) {
		if ( ! isset( $_POST['tac_review_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['tac_review_nonce'] ), 'tac_review' ) || ! current_user_can( 'edit_others_posts' ) ) {
			return;
		}
		$note = sanitize_textarea_field( wp_unslash( $_POST['tac_review_note'] ?? '' ) );
		update_post_meta( $post_id, 'review_note', $note );
		if ( ! empty( $_POST['tac_send_back'] ) ) {
			remove_all_actions( 'save_post_tour' ); // Avoid running the save handlers again.
			wp_update_post( array( 'ID' => $post_id, 'post_status' => 'draft' ) );
			$post   = get_post( $post_id );
			$author = get_userdata( (int) $post->post_author );
			if ( $author ) {
				wp_mail(
					$author->user_email,
					sprintf( '[%s] Changes needed: %s', tac_site_name(), $post->post_title ),
					sprintf( "Please update your listing \"%s\" and submit it again.\n\n%s\n\nYour listings: %s", $post->post_title, $note, tac_frontend_url( '/supplier/listings' ) )
				);
			}
		}
	},
	30
);

// Tell the supplier when their listing goes live.
add_action(
	'transition_post_status',
	function ( $new, $old, WP_Post $post ) {
		if ( 'tour' !== $post->post_type || 'publish' !== $new || 'publish' === $old ) {
			return;
		}
		$author = get_userdata( (int) $post->post_author );
		if ( ! $author || user_can( $author, 'edit_others_posts' ) || get_current_user_id() === (int) $author->ID ) {
			return;
		}
		delete_post_meta( $post->ID, 'review_note' );
		wp_mail(
			$author->user_email,
			sprintf( '[%s] Your listing is live: %s', tac_site_name(), $post->post_title ),
			sprintf( "\"%s\" is now published.\n\nSee it: %s\nYour dashboard: %s", $post->post_title, tac_frontend_url( '/tour/' . $post->post_name . '/' ), tac_frontend_url( '/supplier' ) )
		);
	},
	10,
	3
);
