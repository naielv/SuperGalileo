<script>
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiLink } from '@mdi/js';
	let { href, label, icon = mdiLink, disabled = false } = $props();
</script>

<a class="btn" {href} aria-disabled={disabled} tabindex={disabled ? -1 : 0}>
	<SvgIcon size={20} type="mdi" path={icon} />
	<span>{label}</span>
</a>

<style>
	.btn {
		background: transparent;
		color: white;
		border-color: white;
    width: 100%;
	}
</style>
