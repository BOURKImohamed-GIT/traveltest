<?php
/**
 * Private conversation between the platform team and each business.
 *
 * - Businesses: dashboard → Messages (GET/POST /supplier/messages), unread badge.
 * - Team: wp-admin → Marketplace → Messages (one conversation per business), unread count.
 * - Every new message is also emailed: to the business's sign-up email, or to the
 *   site's admin email, with a link back to the conversation.
 *
 * Messages are private posts of type tac_message: meta supplier_id, sender (team|business),
 * read (1 once the other side has seen it).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'init',
	function () {
		register_post_type(
			'tac_message',
			array(
				'public'       => false,
				'show_ui'      => false,
				'supports'     => array( 'editor', 'author' ),
				'show_in_rest' => false,
			)
		);
	}
);

/**
 * Add a message to a business's conversation and email the other side.
 *
 * @param int    $supplier_id The business.
 * @param string $sender      'team' or 'business'.
 * @param string $text        Plain text.
 * @param int    $author_id   The user who wrote it.
 * @param bool   $notify      Email the other side (off when another email already says it).
 * @param int[]  $photos      Attachment ids (tac_save_uploaded_photos).
 * @return int|WP_Error Message id.
 */
function tac_add_message( $supplier_id, $sender, $text, $author_id = 0, $notify = true, $photos = array() ) {
	$text = trim( sanitize_textarea_field( $text ) );
	if ( '' === $text && ! $photos ) {
		return new WP_Error( 'empty', __( 'Write a message or add a photo first.', 'travel-agency-core' ), array( 'status' => 400 ) );
	}
	$id = wp_insert_post(
		array(
			'post_type'    => 'tac_message',
			'post_status'  => 'private',
			'post_author'  => (int) $author_id,
			'post_title'   => '' !== $text ? wp_trim_words( $text, 8, '…' ) : __( 'Photo', 'travel-agency-core' ),
			'post_content' => mb_substr( $text, 0, 5000 ),
			'meta_input'   => array(
				'supplier_id' => (int) $supplier_id,
				'sender'      => 'team' === $sender ? 'team' : 'business',
				'read'        => 0,
				'photos'      => implode( ',', array_map( 'absint', $photos ) ),
			),
		),
		true
	);
	if ( is_wp_error( $id ) ) {
		return new WP_Error( 'message_failed', __( 'Could not send your message.', 'travel-agency-core' ), array( 'status' => 500 ) );
	}
	if ( $notify ) {
		tac_email_message( $id );
	}
	return $id;
}

/** Email a new message to the other side of the conversation. */
function tac_email_message( $message_id ) {
	$msg      = get_post( $message_id );
	$supplier = get_userdata( (int) get_post_meta( $message_id, 'supplier_id', true ) );
	if ( ! $msg || ! $supplier ) {
		return;
	}
	$site     = tac_site_name();
	$business = tac_supplier_name( $supplier );
	$to_team  = 'business' === get_post_meta( $message_id, 'sender', true );
	$to       = $to_team ? get_option( 'admin_email' ) : $supplier->user_email;
	$from     = $to_team ? $business : sprintf( /* translators: %s: site */ __( 'The %s team', 'travel-agency-core' ), $site );
	$link     = $to_team ? admin_url( 'admin.php?page=tac-messages&business=' . $supplier->ID ) : tac_frontend_url( '/supplier/messages' );
	$button   = $to_team ? __( 'Open the conversation', 'travel-agency-core' ) : __( 'Reply in your dashboard', 'travel-agency-core' );

	$html = '<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a2b49">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:24px 12px"><tr><td align="center">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e6eb">'
		. '<tr><td style="background:#1e7d3c;padding:16px 24px;color:#fff;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">' . esc_html( $site . ' · ' . __( 'New message', 'travel-agency-core' ) ) . '</td></tr>'
		. '<tr><td style="padding:24px">'
		. '<p style="margin:0 0 6px;font-size:13px;color:#5f6b7a;font-weight:700">' . esc_html( sprintf( /* translators: %s: sender */ __( 'From %s', 'travel-agency-core' ), $from ) ) . '</p>'
		. '<div style="padding:14px 16px;background:#f5f6f8;border-left:4px solid #1e7d3c;border-radius:6px;font-size:15px;line-height:1.55;white-space:pre-line">' . esc_html( $msg->post_content ) . '</div>'
		. implode( '', array_map( fn( $p ) => '<a href="' . esc_url( $p['url'] ) . '" style="display:inline-block;margin:10px 8px 0 0"><img src="' . esc_url( $p['thumb'] ) . '" alt="" width="160" style="border-radius:8px;border:1px solid #e3e6eb;display:block"></a>', tac_photo_list( get_post_meta( $message_id, 'photos', true ) ) ) )
		. '<p style="margin:22px 0 6px"><a href="' . esc_url( $link ) . '" style="display:inline-block;background:#c75300;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">' . esc_html( $button ) . '</a></p>'
		. '<p style="margin:14px 0 0;font-size:13px;color:#5f6b7a">' . esc_html(
			$to_team
				? sprintf( /* translators: %s: business */ __( 'Answer %s from wp-admin → Marketplace → Messages. Replying to this email also reaches them.', 'travel-agency-core' ), $business )
				: __( 'Please answer in your dashboard so the whole conversation stays in one place. Replying to this email also reaches us.', 'travel-agency-core' )
		) . '</p>'
		. '</td></tr></table></td></tr></table></body></html>';

	wp_mail(
		$to,
		sprintf( '[%s] %s', $site, $to_team ? sprintf( /* translators: %s: business */ __( 'New message from %s', 'travel-agency-core' ), $business ) : __( 'New message from the team', 'travel-agency-core' ) ),
		$html,
		array(
			'Content-Type: text/html; charset=UTF-8',
			'Reply-To: ' . ( $to_team ? $business . ' <' . $supplier->user_email . '>' : $site . ' <' . get_option( 'admin_email' ) . '>' ),
		)
	);
}

/** The conversation with a business, oldest first. */
function tac_conversation( $supplier_id, $limit = 200 ) {
	return array_reverse(
		get_posts(
			array(
				'post_type'   => 'tac_message',
				'post_status' => 'private',
				'numberposts' => $limit,
				'orderby'     => 'date ID',
				'order'       => 'DESC',
				'meta_key'    => 'supplier_id', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'  => (int) $supplier_id, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		)
	);
}

/** Unread messages: from the team for a business, or from businesses for the team. */
function tac_unread_messages( $for, $supplier_id = 0 ) {
	$meta = array(
		array( 'key' => 'sender', 'value' => 'team' === $for ? 'business' : 'team' ),
		array( 'key' => 'read', 'value' => '0' ),
	);
	if ( $supplier_id ) {
		$meta[] = array( 'key' => 'supplier_id', 'value' => (int) $supplier_id );
	}
	return get_posts(
		array(
			'post_type'   => 'tac_message',
			'post_status' => 'private',
			'numberposts' => -1,
			'fields'      => 'ids',
			'meta_query'  => $meta, // phpcs:ignore WordPress.DB.SlowDBQuery
		)
	);
}

/** Mark what one side has now seen. */
function tac_mark_read( $for, $supplier_id ) {
	foreach ( tac_unread_messages( $for, $supplier_id ) as $id ) {
		update_post_meta( $id, 'read', 1 );
	}
}

function tac_format_message( WP_Post $m ) {
	$author = get_userdata( (int) $m->post_author );
	return array(
		'id'     => $m->ID,
		'from'   => get_post_meta( $m->ID, 'sender', true ),
		'author' => 'team' === get_post_meta( $m->ID, 'sender', true )
			? sprintf( /* translators: %s: site */ __( '%s team', 'travel-agency-core' ), tac_site_name() )
			: ( $author ? $author->display_name : '' ),
		'text'   => $m->post_content,
		'date'   => mysql_to_rfc3339( $m->post_date_gmt ) . 'Z',
		'read'   => (bool) get_post_meta( $m->ID, 'read', true ),
		'photos' => tac_photo_list( get_post_meta( $m->ID, 'photos', true ) ),
	);
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'travel/v1',
			'/supplier/messages',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => function ( WP_REST_Request $req ) {
						$uid  = (int) $req['_tac_user'];
						$list = array_map( 'tac_format_message', tac_conversation( $uid ) );
						tac_mark_read( 'business', $uid );
						return $list;
					},
					'permission_callback' => 'tac_require_supplier',
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => function ( WP_REST_Request $req ) {
						$uid = (int) $req['_tac_user'];
						if ( tac_throttled( 'message_' . $uid, 60 ) ) {
							return new WP_Error( 'too_many_requests', __( 'Too many messages. Try again later.', 'travel-agency-core' ), array( 'status' => 429 ) );
						}
						$photos = tac_save_uploaded_photos( 'photos', 5, $uid, 'message' );
						if ( is_wp_error( $photos ) ) {
							return $photos;
						}
						$id = tac_add_message( $uid, 'business', (string) $req['text'], $uid, true, $photos );
						return is_wp_error( $id ) ? $id : new WP_REST_Response( tac_format_message( get_post( $id ) ), 201 );
					},
					'permission_callback' => 'tac_require_supplier',
					'args'                => array( 'text' => array( 'type' => 'string', 'default' => '', 'maxLength' => 5000 ) ),
				),
			)
		);
	}
);

/* ======================= wp-admin: Marketplace → Messages ======================= */

if ( ! is_admin() ) {
	return;
}

add_action(
	'admin_menu',
	function () {
		$unread = count( tac_unread_messages( 'team' ) );
		$label  = __( 'Messages', 'travel-agency-core' ) . ( $unread ? ' <span class="awaiting-mod count-' . $unread . '"><span class="pending-count">' . $unread . '</span></span>' : '' );
		add_submenu_page( 'tac-marketplace', __( 'Messages', 'travel-agency-core' ), $label, 'edit_others_posts', 'tac-messages', 'tac_render_messages_page', 1 );
	},
	15
);

add_action(
	'admin_post_tac_send_message',
	function () {
		if ( ! current_user_can( 'edit_others_posts' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do this.', 'travel-agency-core' ), 403 );
		}
		check_admin_referer( 'tac_send_message' );
		$business = absint( $_POST['business'] ?? 0 );
		$sent     = 0;
		if ( tac_is_supplier( get_userdata( $business ) ) ) {
			$photos = tac_save_uploaded_photos( 'photos', 5, get_current_user_id(), 'message' );
			$result = is_wp_error( $photos ) ? $photos : tac_add_message( $business, 'team', wp_unslash( $_POST['text'] ?? '' ), get_current_user_id(), true, $photos ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- sanitized in tac_add_message().
			$sent   = is_wp_error( $result ) ? 0 : 1;
		}
		wp_safe_redirect( admin_url( 'admin.php?page=tac-messages&business=' . $business . '&sent=' . $sent . '#reply' ) );
		exit;
	}
);

function tac_render_messages_page() {
	$business = absint( $_GET['business'] ?? 0 ); // phpcs:ignore WordPress.Security.NonceVerification
	$user     = $business ? get_userdata( $business ) : null;
	?>
	<div class="wrap tac-msg">
		<style>
			.tac-msg-layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px;margin-top:12px}
			.tac-msg-list{background:#fff;border:1px solid #dcdcde;border-radius:8px;max-height:72vh;overflow:auto}
			.tac-msg-list a{display:block;padding:12px 14px;border-bottom:1px solid #f0f0f1;text-decoration:none;color:#1d2327}
			.tac-msg-list a.current{background:#fff4ea}
			.tac-msg-list .who{display:flex;justify-content:space-between;gap:8px;font-weight:600}
			.tac-msg-list .last{color:#646970;font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
			.tac-msg-badge{background:#1e7d3c;color:#fff;border-radius:999px;padding:0 7px;font-size:11px;line-height:18px}
			.tac-thread{background:#fff;border:1px solid #dcdcde;border-radius:8px;display:flex;flex-direction:column;min-height:420px}
			.tac-thread-head{padding:12px 16px;border-bottom:1px solid #f0f0f1;display:flex;justify-content:space-between;gap:12px;align-items:center}
			.tac-bubbles{padding:16px;display:flex;flex-direction:column;gap:10px;max-height:56vh;overflow:auto;background:#fafafa}
			.tac-bubble{max-width:75%;padding:10px 14px;border-radius:14px;white-space:pre-line;line-height:1.45}
			.tac-bubble.team{align-self:flex-end;background:#c75300;color:#fff;border-bottom-right-radius:4px}
			.tac-bubble.business{align-self:flex-start;background:#fff;border:1px solid #dcdcde;border-bottom-left-radius:4px}
			.tac-bubble small{display:block;opacity:.75;font-size:11px;margin-top:4px}
			.tac-bubble-photo{display:inline-block;margin:6px 6px 0 0}.tac-bubble-photo img{width:150px;height:110px;object-fit:cover;border-radius:8px;display:block}
			.tac-reply{padding:12px 16px;border-top:1px solid #f0f0f1;display:flex;gap:8px;align-items:flex-end}
			.tac-reply textarea{flex:1;min-height:70px}
			@media (max-width:900px){.tac-msg-layout{grid-template-columns:1fr}}
		</style>
		<h1><?php esc_html_e( 'Messages', 'travel-agency-core' ); ?></h1>
		<p><?php esc_html_e( 'Private conversations with each business. They get an email for each of your messages, and you get one for each of theirs.', 'travel-agency-core' ); ?></p>
		<?php if ( isset( $_GET['sent'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification ?>
			<div class="notice <?php echo '1' === $_GET['sent'] ? 'notice-success' : 'notice-error'; // phpcs:ignore WordPress.Security.NonceVerification ?> is-dismissible"><p><?php echo '1' === $_GET['sent'] ? esc_html__( 'Message sent. The business was emailed.', 'travel-agency-core' ) : esc_html__( 'Message not sent: write a message or add photos (JPG, PNG or WebP, up to 8 MB each, 5 at most).', 'travel-agency-core' ); // phpcs:ignore WordPress.Security.NonceVerification ?></p></div>
		<?php endif; ?>
		<div class="tac-msg-layout">
			<nav class="tac-msg-list" aria-label="<?php esc_attr_e( 'Businesses', 'travel-agency-core' ); ?>">
				<?php
				$suppliers = get_users( array( 'role' => TAC_SUPPLIER_ROLE, 'number' => -1 ) );
				$rows      = array();
				foreach ( $suppliers as $s ) {
					$last   = get_posts( array( 'post_type' => 'tac_message', 'post_status' => 'private', 'numberposts' => 1, 'meta_key' => 'supplier_id', 'meta_value' => $s->ID ) ); // phpcs:ignore WordPress.DB.SlowDBQuery
					$rows[] = array( $s, $last ? $last[0] : null, count( tac_unread_messages( 'team', $s->ID ) ) );
				}
				// Conversations with unread messages first, then the most recent.
				usort( $rows, fn( $a, $b ) => array( $b[2] > 0, $b[1] ? strtotime( $b[1]->post_date_gmt ) : 0 ) <=> array( $a[2] > 0, $a[1] ? strtotime( $a[1]->post_date_gmt ) : 0 ) );
				if ( ! $rows ) {
					echo '<p style="padding:14px">' . esc_html__( 'No business has joined yet.', 'travel-agency-core' ) . '</p>';
				}
				foreach ( $rows as [ $s, $last, $unread ] ) :
					?>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=tac-messages&business=' . $s->ID ) ); ?>" class="<?php echo $business === $s->ID ? 'current' : ''; ?>">
						<span class="who"><span><?php echo esc_html( tac_supplier_name( $s ) ); ?></span><?php echo $unread ? '<span class="tac-msg-badge">' . (int) $unread . '</span>' : ''; ?></span>
						<span class="last"><?php echo $last ? esc_html( ( 'team' === get_post_meta( $last->ID, 'sender', true ) ? __( 'You: ', 'travel-agency-core' ) : '' ) . wp_trim_words( $last->post_content, 10 ) ) : esc_html__( 'No messages yet', 'travel-agency-core' ); ?></span>
					</a>
				<?php endforeach; ?>
			</nav>
			<section class="tac-thread">
				<?php if ( ! $user || ! tac_is_supplier( $user ) ) : ?>
					<p style="padding:24px;color:#646970"><?php esc_html_e( 'Choose a business to read or start a conversation.', 'travel-agency-core' ); ?></p>
				<?php else : ?>
					<?php
					$thread = tac_conversation( $user->ID );
					tac_mark_read( 'team', $user->ID );
					?>
					<div class="tac-thread-head">
						<strong><?php echo esc_html( tac_supplier_name( $user ) ); ?></strong>
						<span><a href="mailto:<?php echo esc_attr( $user->user_email ); ?>"><?php echo esc_html( $user->user_email ); ?></a> · <a href="<?php echo esc_url( admin_url( 'user-edit.php?user_id=' . $user->ID . '#tac-supplier' ) ); ?>"><?php esc_html_e( 'Profile', 'travel-agency-core' ); ?></a></span>
					</div>
					<div class="tac-bubbles" id="tac-bubbles">
						<?php if ( ! $thread ) : ?>
							<p style="color:#646970;margin:auto"><?php esc_html_e( 'No messages yet. Write the first one below.', 'travel-agency-core' ); ?></p>
						<?php endif; ?>
						<?php foreach ( $thread as $m ) : ?>
							<?php $f = tac_format_message( $m ); ?>
							<div class="tac-bubble <?php echo esc_attr( $f['from'] ); ?>"><?php echo esc_html( $f['text'] ); ?><?php foreach ( $f['photos'] as $ph ) : ?><a href="<?php echo esc_url( $ph['url'] ); ?>" target="_blank" rel="noopener" class="tac-bubble-photo"><img src="<?php echo esc_url( $ph['thumb'] ); ?>" alt=""></a><?php endforeach; ?><small><?php echo esc_html( ( 'team' === $f['from'] ? __( 'You', 'travel-agency-core' ) : $f['author'] ) . ' · ' . get_date_from_gmt( $m->post_date_gmt, 'j M Y, H:i' ) . ( 'team' === $f['from'] ? ' · ' . ( $f['read'] ? __( 'Seen', 'travel-agency-core' ) : __( 'Sent', 'travel-agency-core' ) ) : '' ) ); ?></small></div>
						<?php endforeach; ?>
					</div>
					<form class="tac-reply" id="reply" method="post" enctype="multipart/form-data" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
						<?php wp_nonce_field( 'tac_send_message' ); ?>
						<input type="hidden" name="action" value="tac_send_message">
						<input type="hidden" name="business" value="<?php echo esc_attr( (string) $user->ID ); ?>">
						<textarea name="text" maxlength="5000" placeholder="<?php echo esc_attr( sprintf( /* translators: %s: business */ __( 'Write to %s…', 'travel-agency-core' ), tac_supplier_name( $user ) ) ); ?>"></textarea>
						<label class="button" title="<?php esc_attr_e( 'Add up to 5 photos (JPG, PNG or WebP)', 'travel-agency-core' ); ?>"><?php esc_html_e( 'Add photos', 'travel-agency-core' ); ?> <input type="file" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple style="display:none" onchange="this.parentNode.lastChild.textContent=this.files.length?' ('+this.files.length+')':''"><span></span></label>
						<button type="submit" class="button button-primary"><?php esc_html_e( 'Send', 'travel-agency-core' ); ?></button>
					</form>
					<script>var b=document.getElementById('tac-bubbles');if(b){b.scrollTop=b.scrollHeight;}</script>
				<?php endif; ?>
			</section>
		</div>
	</div>
	<?php
}
