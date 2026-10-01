<script>
	import { searchArasaac, pictogramUrl } from '$lib/arasaac';

	let { show = $bindable(false), onPick = null, title = 'Seleccionar pictograma' } = $props();

	let term = $state('');
	let results = $state([]);
	let status = $state('');
	let busy = $state(false);
	let debounceTimer = null;

	function runSearch() {
		const t = String(term || '').trim();
		if (t.length < 2) {
			status = 'Escribe al menos 2 caracteres para buscar.';
			results = [];
			return;
		}
		busy = true;
		status = 'Buscando…';
		searchArasaac(t)
			.then((items) => {
				results = items.slice(0, 60);
				status = `${items.length} pictograma(s)`;
			})
			.catch(() => {
				results = [];
				status = 'Error al buscar pictogramas.';
			})
			.finally(() => {
				busy = false;
			});
	}

	function onInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(runSearch, 300);
	}

	function pick(item) {
		onPick?.({ text: item.label || String(term).trim(), arasaacId: item.id });
		close();
	}

	function limpiar() {
		term = '';
		results = [];
		status = '';
		clearTimeout(debounceTimer);
	}

	function close() {
		show = false;
		clearTimeout(debounceTimer);
	}

	function onKeydown(event) {
		if (event.key === 'Escape') close();
	}
</script>

{#if show}
	<div class="overlay" onclick={(e) => e.target === e.currentTarget && close()} onkeydown={onKeydown}>
		<div class="panel" role="dialog" aria-modal="true">
			<div class="bar">
				<input
					type="text"
					placeholder="Buscar pictogramas ARASAAC…"
					bind:value={term}
					oninput={onInput}
					autofocus
				/>
				<button type="button" class="btn" onclick={limpiar}>Limpiar</button>
				<button type="button" class="btn danger" onclick={close}>Cerrar</button>
			</div>
			<p class="title">{title}</p>
			<p class="status">{status || 'Busca un alimento para asociarle un pictograma.'}</p>

			{#if busy}
				<p class="status">Cargando…</p>
			{/if}

			<div class="results">
				{#each results as item (item.id)}
					<button type="button" class="result" onclick={() => pick(item)}>
						<img src={pictogramUrl(item.id)} alt={item.label} loading="lazy" />
						<span>{item.label}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}
	.panel {
		background: #fff;
		padding: 12px;
		border-radius: 8px;
		width: min(680px, 100%);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
		max-height: 90vh;
		overflow: auto;
	}
	.bar {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.bar input {
		flex: 1;
		padding: 8px;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 15px;
	}
	.btn {
		padding: 8px 12px;
		border: none;
		border-radius: 4px;
		background: #667eea;
		color: #fff;
		font-weight: 700;
		cursor: pointer;
	}
	.btn.danger {
		background: #ff4757;
	}
	.title {
		font-weight: 700;
		margin: 10px 0 2px;
	}
	.status {
		margin: 2px 0 8px;
		color: #555;
		font-size: 13px;
	}
	.results {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.result {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 4px;
		border: 1px solid #ddd;
		background: #fff;
		cursor: pointer;
		border-radius: 4px;
		width: 84px;
	}
	.result:hover {
		border-color: #667eea;
		background: #f1f4ff;
	}
	.result img {
		width: 64px;
		height: 64px;
		object-fit: contain;
	}
	.result span {
		font-size: 12px;
		text-align: center;
		line-height: 1.1;
		overflow-wrap: anywhere;
	}
</style>