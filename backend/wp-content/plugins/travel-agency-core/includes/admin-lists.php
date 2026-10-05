<?php
/**
 * wp-admin screens for running the agency:
 * - Users: travellers with their bookings; suspend / unsuspend.
 * - Inquiries: booking requests and contact messages with status, listing,
 *   traveller, date and guests; status filter; confirm or decline with an
 *   optional email to the traveller.
 * - Listings: price column.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! is_admin() ) {
	return;
}

const TAC_STATUS_LABELS = array(
	'requested' => 'Waiting for reply',
	'confirmed' => 'Confirmed',
	'declined'  => 'Declined',
	'cancelled' => 'Cancelled',
	'message'   => 'Contact message',
);

add_action(
	'admin_head',
	function () {
		echo '<style>
			.tac-pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;background:#f0f0f1;color:#50575e}
			.tac-pill.requested{background:#fcf0d1;color:#6b4e00}
			.tac-pill.confirmed{background:#fff1e6;color:#9a3412}
			.tac-pill.message{background:#e7f0fb;color:#1d4f91}
			.tac-pill.suspended{background:#fcf0f1;color:#b32d2e}
			.column-tac_status{width:140px}
			.column-tac_guests,.column-tac_bookings{width:80px}
		</style>';
	}
);

function tac_pill( $class, $label ) {
	return '<span class="tac-pill ' . esc_attr( $class ) . '">' . esc_html( $label ) . '</span>';
}

/* ======================= Users ======================= */

add_filter(
	'manage_users_columns',
	function ( $cols ) {
		$cols['tac_bookings'] = __( 'Bookings', 'travel-agency-core' );
		unset( $cols['posts'] );
		return $cols;
	}
);

add_filter(
	'manage_users_custom_column',
	function ( $out, $col, $user_id ) {
		if ( 'tac_bookings' !== $col ) {
			return $out;
		}
		$out = (string) count( tac_client_inquiries( get_userdata( $user_id ) ) );
		if ( tac_is_suspended( $user_id ) ) {
			$out .= ' ' . tac_pill( 'suspended', __( 'Suspended', 'travel-agency-core' ) );
		}
		return $out;
	},
	10,
	3
);

add_filter(
	'views_users',
	function ( $views ) {
		$current               = isset( $_GET['tac_view'] ) ? sanitize_key( $_GET['tac_view'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		$views['tac_suspended'] = sprintf(
			'<a href="%s"%s>%s <span class="count">(%d)</span></a>',
			esc_url( add_query_arg( 'tac_view', 'suspended', admin_url( 'users.php' ) ) ),
			'suspended' === $current ? ' class="current" aria-current="page"' : '',
			esc_html__( 'Suspended', 'travel-agency-core' ),
			count( tac_suspended_user_ids() )
		);
		return $views;
	}
);

add_action(
	'pre_get_users',
	function ( WP_User_Query $q ) {
		global $pagenow;
		if ( 'users.php' === $pagenow && isset( $_GET['tac_view'] ) && 'suspended' === $_GET['tac_view'] ) { // phpcs:ignore WordPress.Security.NonceVerification
			$q->set( 'meta_query', array( array( 'key' => 'tac_suspended', 'value' => '1' ) ) );
		}
	}
);

// Suspend / Unsuspend row actions (never on administrators).
add_filter(
	'user_row_actions',
	function ( $actions, WP_User $user ) {
		if ( ! current_user_can( 'edit_user', $user->ID ) || user_can( $user, 'manage_options' ) ) {
			return $actions;
		}
		$suspended = tac_is_suspended( $user->ID );
		$url       = wp_nonce_url(
			add_query_arg(
				array(
					'tac_suspend' => $suspended ? '0' : '1',
					'user'        => $user->ID,
				),
				admin_url( 'users.php' )
			),
			'tac_suspend_' . $user->ID
		);
		$actions['tac_suspend'] = '<a href="' . esc_url( $url ) . '"' . ( $suspended ? '' : ' style="color:#b32d2e"' ) . '>' . esc_html( $suspended ? __( 'Unsuspend', 'travel-agency-core' ) : __( 'Suspend', 'travel-agency-core' ) ) . '</a>';
		return $actions;
	},
	10,
	2
);

add_action(
	'admin_init',
	function () {
		if ( ! isset( $_GET['tac_suspend'], $_GET['user'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$user_id = absint( $_GET['user'] ); // phpcs:ignore WordPress.Security.NonceVerification
		check_admin_referer( 'tac_suspend_' . $user_id );
		if ( ! current_user_can( 'edit_user', $user_id ) || user_can( $user_id, 'manage_options' ) ) {
			wp_die( esc_html__( 'You cannot change this account.', 'travel-agency-core' ) );
		}
		$suspend = '1' === $_GET['tac_suspend']; // phpcs:ignore WordPress.Security.NonceVerification
		tac_set_suspended( $user_id, $suspend );
		wp_safe_redirect( add_query_arg( 'tac_suspended', $suspend ? 'on' : 'off', admin_url( 'users.php' ) ) );
		exit;
	}
);

add_action(
	'admin_notices',
	function () {
		if ( empty( $_GET['tac_suspended'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$on = 'on' === $_GET['tac_suspended']; // phpcs:ignore WordPress.Security.NonceVerification
		printf(
			'<div class="notice notice-success is-dismissible"><p>%s</p></div>',
			esc_html( $on ? __( 'Account suspended: it is signed out and cannot sign in.', 'travel-agency-core' ) : __( 'Account restored.', 'travel-agency-core' ) )
		);
	}
);

// Phone and suspension on the user's profile screen.
function tac_profile_fields( WP_User $user ) {
	?>
	<h2><?php esc_html_e( 'Traveller details', 'travel-agency-core' ); ?></h2>
	<table class="form-table" role="presentation">
		<tr>
			<th><label for="tac_phone"><?php esc_html_e( 'Phone / WhatsApp', 'travel-agency-core' ); ?></label></th>
			<td><input type="text" class="regular-text" name="tac_phone" id="tac_phone" value="<?php echo esc_attr( get_user_meta( $user->ID, 'tac_phone', true ) ); ?>"></td>
		</tr>
		<?php if ( ! user_can( $user, 'manage_options' ) ) : ?>
		<tr>
			<th><?php esc_html_e( 'Suspended', 'travel-agency-core' ); ?></th>
			<td><label><input type="checkbox" name="tac_suspended" value="1" <?php checked( tac_is_suspended( $user->ID ) ); ?>> <?php esc_html_e( 'Block sign-in', 'travel-agency-core' ); ?></label></td>
		</tr>
		<?php endif; ?>
	</table>
	<?php
}
add_action( 'show_user_profile', 'tac_profile_fields' );
add_action( 'edit_user_profile', 'tac_profile_fields' );

function tac_save_profile_fields( $user_id ) {
	if ( ! current_user_can( 'edit_user', $user_id ) ) {
		return;
	}
	check_admin_referer( 'update-user_' . $user_id );
	if ( isset( $_POST['tac_phone'] ) ) {
		update_user_meta( $user_id, 'tac_phone', sanitize_text_field( wp_unslash( $_POST['tac_phone'] ) ) );
	}
	if ( ! user_can( $user_id, 'manage_options' ) ) {
		$want = ! empty( $_POST['tac_suspended'] );
		if ( $want !== tac_is_suspended( $user_id ) ) {
			tac_set_suspended( $user_id, $want );
		}
	}
}
add_action( 'personal_options_update', 'tac_save_profile_fields' );
add_action( 'edit_user_profile_update', 'tac_save_profile_fields' );

/* ======================= Inquiries (bookings and messages) ======================= */

add_filter(
	'manage_inquiry_posts_columns',
	function () {
		return array(
			'cb'          => '<input type="checkbox" />',
			'tac_status'  => __( 'Status', 'travel-agency-core' ),
			'title'       => __( 'Request', 'travel-agency-core' ),
			'tac_listing' => __( 'Listing', 'travel-agency-core' ),
			'tac_client'  => __( 'Traveller', 'travel-agency-core' ),
			'tac_when'    => __( 'Date', 'travel-agency-core' ),
			'tac_guests'  => __( 'Guests', 'travel-agency-core' ),
			'date'        => __( 'Received', 'travel-agency-core' ),
		);
	}
);

add_action(
	'manage_inquiry_posts_custom_column',
	function ( $col, $post_id ) {
		switch ( $col ) {
			case 'tac_status':
				$s = (string) get_post_meta( $post_id, 'status', true ) ?: 'requested';
				echo tac_pill( $s, TAC_STATUS_LABELS[ $s ] ?? $s ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in tac_pill().
				break;
			case 'tac_listing':
				$l = get_post( (int) get_post_meta( $post_id, 'tour_id', true ) );
				if ( $l ) {
					echo '<a href="' . esc_url( get_edit_post_link( $l->ID ) ) . '">' . esc_html( $l->post_title ) . '</a>';
				}
				break;
			case 'tac_client':
				$email = (string) get_post_meta( $post_id, 'email', true );
				echo esc_html( (string) get_post_meta( $post_id, 'name', true ) ) . '<br><a href="mailto:' . esc_attr( $email ) . '">' . esc_html( $email ) . '</a>';
				$phone = (string) get_post_meta( $post_id, 'phone', true );
				if ( $phone ) {
					echo '<br><span class="description">' . esc_html( $phone ) . '</span>';
				}
				break;
			case 'tac_when':
				echo esc_html( (string) get_post_meta( $post_id, 'date', true ) );
				break;
			case 'tac_guests':
				$g = (int) get_post_meta( $post_id, 'guests', true );
				echo $g ? (int) $g : '';
				break;
		}
	},
	10,
	2
);

add_action(
	'restrict_manage_posts',
	function ( $post_type ) {
		if ( 'inquiry' !== $post_type ) {
			return;
		}
		$current = isset( $_GET['tac_status'] ) ? sanitize_key( $_GET['tac_status'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		echo '<select name="tac_status"><option value="">' . esc_html__( 'All statuses', 'travel-agency-core' ) . '</option>';
		foreach ( TAC_STATUS_LABELS as $key => $label ) {
			echo '<option value="' . esc_attr( $key ) . '"' . selected( $current, $key, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
	}
);

add_action(
	'pre_get_posts',
	function ( WP_Query $q ) {
		global $pagenow;
		if ( 'edit.php' !== $pagenow || ! $q->is_main_query() || 'inquiry' !== $q->get( 'post_type' ) || empty( $_GET['tac_status'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$status = sanitize_key( $_GET['tac_status'] ); // phpcs:ignore WordPress.Security.NonceVerification
		if ( 'requested' === $status ) {
			$q->set(
				'meta_query',
				array(
					'relation' => 'OR',
					array( 'key' => 'status', 'value' => 'requested' ),
					array( 'key' => 'status', 'compare' => 'NOT EXISTS' ),
				)
			);
		} elseif ( isset( TAC_STATUS_LABELS[ $status ] ) ) {
			$q->set( 'meta_query', array( array( 'key' => 'status', 'value' => $status ) ) );
		}
	}
);

// Answer a booking from its edit screen.
add_action(
	'add_meta_boxes_inquiry',
	function () {
		add_meta_box(
			'tac_inquiry_answer',
			__( 'Answer this request', 'travel-agency-core' ),
			function ( WP_Post $post ) {
				$s = (string) get_post_meta( $post->ID, 'status', true ) ?: 'requested';
				wp_nonce_field( 'tac_inquiry_status', 'tac_inquiry_status_nonce' );
				if ( 'message' === $s ) {
					echo '<p>' . esc_html__( 'Contact form message. Reply to the sender by email.', 'travel-agency-core' ) . '</p>';
					return;
				}
				echo '<p><label for="tac_inquiry_status"><strong>' . esc_html__( 'Status', 'travel-agency-core' ) . '</strong></label><br><select name="tac_inquiry_status" id="tac_inquiry_status" style="width:100%">';
				foreach ( TAC_STATUS_LABELS as $key => $label ) {
					if ( 'message' !== $key ) {
						echo '<option value="' . esc_attr( $key ) . '"' . selected( $s, $key, false ) . '>' . esc_html( $label ) . '</option>';
					}
				}
				echo '</select></p>';
				echo '<p><label for="tac_inquiry_reply"><strong>' . esc_html__( 'Message to the traveller', 'travel-agency-core' ) . '</strong></label><br>';
				echo '<textarea name="tac_inquiry_reply" id="tac_inquiry_reply" rows="4" style="width:100%" placeholder="' . esc_attr__( 'Pickup time, what to bring…', 'travel-agency-core' ) . '">' . esc_textarea( (string) get_post_meta( $post->ID, 'reply', true ) ) . '</textarea></p>';
				echo '<p><label><input type="checkbox" name="tac_inquiry_notify" value="1" checked> ' . esc_html__( 'Email the traveller when confirmed or declined', 'travel-agency-core' ) . '</label></p>';
				echo '<p class="description">' . esc_html__( 'The traveller also sees the status and your message in My bookings.', 'travel-agency-core' ) . '</p>';
			},
			'inquiry',
			'side',
			'high'
		);
	}
);

add_action(
	'save_post_inquiry',
	function ( $post_id ) {
		if ( ! isset( $_POST['tac_inquiry_status_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['tac_inquiry_status_nonce'] ), 'tac_inquiry_status' ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) || empty( $_POST['tac_inquiry_status'] ) ) {
			return;
		}
		$new = sanitize_key( $_POST['tac_inquiry_status'] );
		if ( ! isset( TAC_STATUS_LABELS[ $new ] ) || 'message' === $new ) {
			return;
		}
		$old = (string) get_post_meta( $post_id, 'status', true );
		update_post_meta( $post_id, 'status', $new );
		if ( isset( $_POST['tac_inquiry_reply'] ) ) {
			update_post_meta( $post_id, 'reply', sanitize_textarea_field( wp_unslash( $_POST['tac_inquiry_reply'] ) ) );
		}
		if ( $new !== $old && ! empty( $_POST['tac_inquiry_notify'] ) ) {
			tac_email_booking_update( $post_id );
		}
	}
);

/* ======================= Listings ======================= */

add_filter(
	'manage_tour_posts_columns',
	function ( $cols ) {
		$new = array();
		foreach ( $cols as $key => $label ) {
			$new[ $key ] = $label;
			if ( 'title' === $key ) {
				$new['tac_price'] = __( 'Price', 'travel-agency-core' );
			}
		}
		unset( $new['author'] );
		return $new;
	}
);

add_action(
	'manage_tour_posts_custom_column',
	function ( $col, $post_id ) {
		if ( 'tac_price' !== $col ) {
			return;
		}
		$price = (float) get_post_meta( $post_id, 'price', true );
		$units = tac_price_units();
		$unit  = get_post_meta( $post_id, 'price_unit', true ) ?: 'per_adult';
		echo esc_html( $price ? number_format_i18n( $price ) . ' ' . ( get_post_meta( $post_id, 'currency', true ) ?: 'EUR' ) . ' ' . ( $units[ $unit ] ?? '' ) : '—' );
	},
	10,
	2
);
