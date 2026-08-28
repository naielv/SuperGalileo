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

	const idParam = page.params.id;
	const isNew = idParam === '_new';

	let activeDbName = $state('');
	let dbInstance = $state(null);
	let feedback = $state({ type: 'info', message: '' });

	let asunto = $state('');
	let contenido = $state('');
	let autor = $state(null);
	let rev = $state('');

	function setFeedback(message, type = 'info') {
		feedback = { type, message };
	}

	function loadActiveDatabase() {
		try {
			const activeDb = getActiveDbConfig();
			dbInstance = getActiveDb();
			if (activeDb && dbInstance) {
				activeDbName = activeDb.localDatabase;
				loadData();
			} else {
				setFeedback('No hay base de datos activa seleccionada.', 'warning');
			}
		} catch (e) {
			setFeedback('Error al cargar base de datos: ' + e.message, 'error');
		}
	}

	async function loadData() {
		if (!dbInstance) return;
		if (isNew) return;

		try {
			const doc = await dbInstance.get(`notas:${idParam}`);
			const data = doc.data || doc;
			asunto = data.Asunto || '';
			contenido = data.Contenido || '';
			if (data.Autor) {
                const personId = data.Autor.startsWith('personas:') ? data.Autor : "personas:" + data.Autor;
                autor = { key: personId, label: personId };
			}
			rev = doc._rev;
		} catch (err) {
			if (err.status === 404) {
				setFeedback('La nota solicitada no existe.', 'error');
			} else {
				setFeedback('Error al cargar datos: ' + err.message, 'error');
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
			setFeedback('Nota guardada con éxito.', 'success');
			setTimeout(() => { goto('/notes'); }, 1000);
		} catch (err) {
			setFeedback('Error al guardar: ' + err.message, 'error');
		}
	}

	async function deleteNote() {
		if (!confirm(`¿Seguro que deseas eliminar la nota "${asunto}"?`)) return;
		if (!dbInstance || isNew) return;

		try {
			const doc = await dbInstance.get(`notas:${idParam}`);
			await dbInstance.remove(doc);
			setFeedback('Nota eliminada con éxito.', 'success');
			setTimeout(() => { goto('/notes'); }, 1000);
		} catch (err) {
			setFeedback('Error al eliminar: ' + err.message, 'error');
		}
	}

	onMount(() => {
		loadActiveDatabase();
	});
</script>

<div class="header-container">
	<a href="/notes" class="back-link">
		<SvgIcon path={mdiArrowLeft} type="mdi" size="1.2em" /> Volver a Notas
	</a>
	<h1>{isNew ? 'Nueva Nota' : `Editar: ${asunto}`}</h1>
</div>

<main>
	{#if feedback.message}
		<p class="status-banner {feedback.type}">{feedback.message}</p>
	{/if}

	{#if dbInstance}
		<form onsubmit={saveNote}>
			<fieldset>
				<legend>
					<SvgIcon path={mdiNote} type="mdi" size="1.2em" /> Datos de la Nota
				</legend>

				<PersonSelector
                    required
					label="Autor"
					bind:selected={autor}
				/>

				<label>
					<b>Asunto:</b>
					<input type="text" bind:value={asunto} placeholder="Título de la nota" required />
				</label>

				<label>
					<b>Contenido:</b>
					<textarea
						bind:value={contenido}
						rows="20"
						placeholder="Escribe el contenido..."
					></textarea>
				</label>
			</fieldset>

			<div class="form-actions">
				<FormSubmitButton label={isNew ? 'Crear Nota' : 'Guardar Cambios'} icon={mdiContentSave} />
				{#if !isNew}
                    <ActionButton onclick={deleteNote} icon={mdiDelete} label="Eliminar Nota" background="#b91c1c" />
				{/if}
			</div>
		</form>
	{/if}
</main>

<style>
	.header-container {
		background: darkslateblue;
		padding: 15px;
		color: white;
		text-align: center;
		position: relative;
	}
	.header-container h1 { background: transparent; padding: 0; margin: 0; }
	.back-link {
		position: absolute;
		left: 15px;
		top: 50%;
		transform: translateY(-50%);
		color: white;
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 16px;
	}

	.status-banner {
		padding: 10px;
		border-radius: 5px;
		margin-bottom: 15px;
		font-weight: bold;
	}
	.status-banner.success { background: #d9f7dd; color: #124218; }
	.status-banner.warning { background: #fff4cc; color: #5b4200; }
	.status-banner.error { background: #ffe1e1; color: #6f1111; }

	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 20px;
		align-items: center;
		flex-wrap: wrap;
	}
</style>
