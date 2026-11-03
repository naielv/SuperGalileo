<script>
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiLink } from '@mdi/js';

	let {
		type = 'action',
		href,
		onclick,
		label,
		icon = mdiLink,
		background,
		disabled = false,
		spin = false
	} = $props();

	const isLink = $derived(type === 'link' || type === 'sidebar');
	const isSidebar = $derived(type === 'sidebar');
	const buttonBackground = $derived(
		background ?? (type === 'submit' ? 'darkolivegreen' : 'var(--accent)')
	);
</script>

{#if isLink}
	<a
		class="btn"
		class:sidebar={isSidebar}
		{href}
		aria-disabled={disabled}
		tabindex={disabled ? -1 : 0}
		style:background={isSidebar ? 'transparent' : buttonBackground}
	>
		<SvgIcon size={isSidebar ? 20 : undefined} type="mdi" path={icon} />
		<span>{label}</span>
	</a>
{:else}
	<button
		class="btn"
		type={type === 'submit' ? 'submit' : 'button'}
		{onclick}
		style:background={buttonBackground}
		{disabled}
	>
		<SvgIcon
			type="mdi"
			path={icon}
			style={`animation: ${spin ? 'spin 1s linear infinite' : 'none'};`}
		/>
		<span>{label}</span>
	</button>
{/if}

<style>
	.sidebar {
		background: transparent;
		color: white;
		border-color: white;
		width: 100%;
	}
	.btn {
		flex-direction: column;
		width: 175px;
		text-align: center;
		padding: 10px 5px;
	}
	.btn :global(svg) {
		height: 72px;
		width: 72px;
	}
</style>
