<script>
	import { pictogramUrl } from '$lib/arasaac';
	import { normalizePicto } from '$lib/comedor';

	let { value, size = 56 } = $props();

	const picto = $derived(normalizePicto(value));
</script>

{#if picto.arasaacId}
	<img src={pictogramUrl(picto.arasaacId)} alt={picto.text || 'Pictograma'} width={size} height={size} loading="lazy" />
{:else if picto.text}
	<span class="text">{picto.text}</span>
{:else}
	<span class="text muted">—</span>
{/if}

<style>
	img {
		object-fit: contain;
	}
	.text {
		font-weight: 600;
	}
	.muted {
		color: #999;
	}
</style>