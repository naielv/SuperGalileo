<script>
	import { m } from '$lib/paraglide/messages';

	let { person, showRegion = true } = $props();
</script>

{#if showRegion}
	<span class="badge region">{person.Region || 'Sin región'}</span>
{/if}
{#if person.Oculto}
	<span class="badge status hidden">{m.hidden()}</span>
{/if}
{#if person.Roles && person.Roles.split(',').includes('ADMIN')}
	<span class="badge role">{m.admin()}</span>
{/if}

<style>
	.badge {
		padding: 3px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: bold;
		display: inline-block;
    	width: fit-content;
	}

	.badge.region {
		background: #e0f2fe;
		color: #0369a1;
	}

	.badge.role {
		background: #f3e8ff;
		color: #6b21a8;
	}

	.badge.status.hidden {
		background: #fee2e2;
		color: #b91c1c;
	}
</style>
