<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getActiveDb, getActiveDbConfig, safeRandomString } from '$lib/db';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiArrowLeft, mdiContentSave, mdiDelete, mdiNote } from '@mdi/js';
	import FormSubmitButton from '$lib/comp/buttons/FormSubmitButton.svelte';
	import PersonSelector from '$lib/comp/PersonSelector.svelte';
	import ActionButton from '$lib/comp/buttons/ActionButton.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte5-toaster';

	let idParam = $derived(page.params.id);
	let isNew = $derived(idParam === '_new');

	let activeDbName = $state('');
	let dbInstance = $state(null);

	let asunto = $state('');
	let contenido = $state('');
	let autor = $state(null);
	let rev = $state('');

	function loadActiveDatabase() {
		const activeDb = getActiveDbConfig();
		dbInstance = getActiveDb();
		if (activeDb && dbInstance) {
			activeDbName = activeDb.localDatabase;
			loadData();
		} else {
			console.warn('No hay base de datos activa seleccionada.');
		}
	}

	async function loadData(idParam) {
		if (!dbInstance) return;
		if (isNew) {
			asunto = '';
			contenido = '';
			autor = null;
			rev = '';
			return
		};

		try {
			const doc = await dbInstance.get(`notas:${idParam}`);
			const data = doc.data || doc;
			asunto = data.Asunto || '';
			contenido = data.Contenido || '';
			if (data.Autor) {
				const personId = data.Autor.startsWith('personas:') ? data.Autor : 'personas:' + data.Autor;
				autor = { key: personId, label: personId };
			}
			rev = doc._rev;
		} catch (err) {
			if (err.status === 404) {
				console.error('La nota solicitada no existe.');
			} else {
				console.error('Error al cargar datos: ' + err.message);
			}
		}
	}

	async function saveNote(e) {
		e.preventDefault();
		if (!dbInstance) return;

		const docId = isNew
			? `notas:${safeRandomString()}` // Use default size
			: `notas:${idParam}`;

		const payload = {
			_id: docId,
			data: {
				Asunto: asunto.trim(),
				Contenido: contenido,
				Autor: (autor?.key || ':').split(':')[1] || null
			}
		};

		if (!isNew && rev) {
			payload._rev = rev;
		}

		try {
			await dbInstance.put(payload);
			toast.success('¡Guardado!')
			loadData(idParam);
			//goto('/notes');
		} catch (err) {
			toast.error('Error al guardar', {description: err.message})
		}
	}

	async function deleteNote() {
		if (!confirm(`¿Seguro que deseas eliminar la nota "${asunto}"?`)) return;
		if (!dbInstance || isNew) return;

		try {
			const doc = await dbInstance.get(`notas:${idParam}`);
			await dbInstance.remove(doc);
			toast.success('¡Borrado!')
			goto('/notes');
		} catch (err) {
			toast.error('Error al eliminar', {description: err.message})
		}
	}

	onMount(() => {
		try {
			const config = getActiveDbConfig();

			if (!config) {
				return;
			}

			dbInstance = getActiveDb();
		} catch (error) {
			console.error(
				m.db_load_error({ error: error.message })
			);
		}
	});

	$effect(() => {
		if (dbInstance && idParam) {
			loadData(idParam);
			window.dispatchEvent(new CustomEvent('sidebar-closed'));
		}
	});
</script>

{#if dbInstance}
	<form onsubmit={saveNote}>
		<textarea class="title" bind:value={asunto} placeholder="Título de la nota" required></textarea>
		<textarea class="body" bind:value={contenido} placeholder="Escribe el contenido..."></textarea>

		<div class="actions">
			<FormSubmitButton label={'Guardar'} icon={mdiContentSave} />
			{#if !isNew}
				<ActionButton
					onclick={deleteNote}
					icon={mdiDelete}
					label="Eliminar"
					background="#b91c1c"
				/>
			{/if}
		</div>
	</form>
{/if}

<style>
	form {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	textarea.title {
		font-size: 22.5px;
		padding: 4px;
		margin: 0;
	}
	textarea.body {
		flex: 1;
		margin: 0;
	}
	.actions {
		display: flex;
		gap: 5px;
		flex-direction: row;
		width: 100%;
		justify-content: space-between;
	}
</style>
