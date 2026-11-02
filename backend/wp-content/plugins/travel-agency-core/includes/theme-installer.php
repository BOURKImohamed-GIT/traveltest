<?php
/**
 * The plugin carries the "Experience in Morocco" theme (folder theme/moroccotravely, made by
 * scripts/build-wordpress-zips.sh), so the theme can be installed and kept up to date without
 * uploading a theme zip — some hosts refuse that upload ("Incompatible Archive").
 *
 * - Theme already installed: updated automatically when the plugin brings a newer build.
 * - Not installed: a notice and a button in Agency details install and activate it.
 *
 * The site photos are not duplicated: they are copied from the plugin's data/images.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAC_THEME_SLUG = 'moroccotravely';

function tac_theme_bundle_dir() {
	return TAC_DIR . 'theme/' . TAC_THEME_SLUG;
}

/** Fingerprint of the bundled build, to know when the installed theme is out of date. */
function tac_theme_bundle_hash() {
	$files = array( 'style.css', 'functions.php', 'index.php', 'app/app.js', 'app/app.css' );
	$parts = '';
	foreach ( $files as $f ) {
		$path   = tac_theme_bundle_dir() . '/' . $f;
		$parts .= is_readable( $path ) ? md5_file( $path ) : '-';
	}
	return md5( $parts );
}

function tac_theme_bundled() {
	return is_readable( tac_theme_bundle_dir() . '/style.css' );
}

function tac_theme_installed() {
	return is_readable( get_theme_root() . '/' . TAC_THEME_SLUG . '/style.css' );
}

/**
 * Copy the bundled theme into wp-content/themes. Returns true or a WP_Error.
 */
function tac_install_bundled_theme() {
	if ( ! tac_theme_bundled() ) {
		return new WP_Error( 'no_bundle', __( 'This copy of the plugin does not include the theme.', 'travel-agency-core' ) );
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	if ( ! WP_Filesystem() ) {
		return new WP_Error( 'filesystem', __( 'WordPress cannot write to the themes folder on this server. Install the theme from your hosting File Manager instead.', 'travel-agency-core' ) );
	}
	global $wp_filesystem;
	$target = trailingslashit( get_theme_root() ) . TAC_THEME_SLUG;
	if ( ! $wp_filesystem->is_dir( $target ) && ! $wp_filesystem->mkdir( $target, FS_CHMOD_DIR ) ) {
		return new WP_Error( 'mkdir', __( 'Could not create the theme folder.', 'travel-agency-core' ) );
	}
	// Remove the old app build first so no stale files stay behind.
	if ( $wp_filesystem->is_dir( $target . '/app' ) ) {
		$wp_filesystem->delete( $target . '/app', true );
	}
	$copied = copy_dir( tac_theme_bundle_dir(), $target );
	if ( is_wp_error( $copied ) ) {
		return $copied;
	}
	$images = $target . '/app/images';
	if ( ! $wp_filesystem->is_dir( $images ) ) {
		$wp_filesystem->mkdir( $images, FS_CHMOD_DIR );
	}
	foreach ( glob( TAC_DIR . 'data/images/*.jpg' ) ?: array() as $photo ) {
		$wp_filesystem->copy( $photo, $images . '/' . basename( $photo ), true, FS_CHMOD_FILE );
	}
	update_option( 'tac_theme_bundle_hash', tac_theme_bundle_hash(), false );
	wp_clean_themes_cache();
	return true;
}

// Keep an installed theme in step with the plugin.
add_action(
	'admin_init',
	function () {
		if ( ! current_user_can( 'update_themes' ) || ! tac_theme_bundled() || ! tac_theme_installed() ) {
			return;
		}
		if ( get_option( 'tac_theme_bundle_hash' ) === tac_theme_bundle_hash() ) {
			return;
		}
		$result = tac_install_bundled_theme();
		set_transient( 'tac_theme_notice', is_wp_error( $result ) ? 'error:' . $result->get_error_message() : 'updated', 60 );
	}
);

// Install button (admin-post.php?action=tac_install_theme).
add_action(
	'admin_post_tac_install_theme',
	function () {
		if ( ! current_user_can( 'install_themes' ) || ! current_user_can( 'switch_themes' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do this.', 'travel-agency-core' ), 403 );
		}
		check_admin_referer( 'tac_install_theme' );
		$result = tac_install_bundled_theme();
		if ( ! is_wp_error( $result ) ) {
			switch_theme( TAC_THEME_SLUG );
		}
		set_transient( 'tac_theme_notice', is_wp_error( $result ) ? 'error:' . $result->get_error_message() : 'installed', 60 );
		wp_safe_redirect( admin_url( 'admin.php?page=tac-agency' ) );
		exit;
	}
);

function tac_theme_install_button( $label ) {
	?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
		<?php wp_nonce_field( 'tac_install_theme' ); ?>
		<input type="hidden" name="action" value="tac_install_theme">
		<button type="submit" class="button button-primary"><?php echo esc_html( $label ); ?></button>
	</form>
	<?php
}

add_action(
	'admin_notices',
	function () {
		if ( ! current_user_can( 'switch_themes' ) ) {
			return;
		}
		$notice = get_transient( 'tac_theme_notice' );
		if ( $notice ) {
			delete_transient( 'tac_theme_notice' );
			if ( 0 === strpos( $notice, 'error:' ) ) {
				echo '<div class="notice notice-error"><p>' . esc_html( substr( $notice, 6 ) ) . '</p></div>';
			} else {
				echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( 'installed' === $notice ? __( 'The Experience in Morocco theme is installed and active.', 'travel-agency-core' ) : __( 'The Experience in Morocco theme was updated to the version in the plugin.', 'travel-agency-core' ) ) . '</p></div>';
			}
		}
		if ( tac_theme_bundled() && TAC_THEME_SLUG !== get_stylesheet() ) {
			echo '<div class="notice notice-warning"><p><strong>' . esc_html__( 'Experience in Morocco theme', 'travel-agency-core' ) . '</strong> — ' . esc_html__( 'the site needs this theme. Install and activate it in one click (no zip upload needed):', 'travel-agency-core' ) . ' ';
			tac_theme_install_button( tac_theme_installed() ? __( 'Update and activate the theme', 'travel-agency-core' ) : __( 'Install and activate the theme', 'travel-agency-core' ) );
			echo '</p></div>';
		}
	}
);
