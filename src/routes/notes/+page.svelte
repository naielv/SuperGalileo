<script>
	import { onMount } from 'svelte';
	import { getActiveDb, getActiveDbConfig } from '$lib/db';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiNotePlus, mdiPencil, mdiDelete, mdiNoteEdit, mdiNote } from '@mdi/js';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import DataTable from '$lib/comp/DataTable.svelte';
	import DataListRow from '$lib/comp/DataListRow.svelte';
	import genericAvatar from '$lib/assets/user_generic.png';
	let activeDbName = $state('');
	let dbInstance = $state(null);
	let feedback = $state({ type: 'info', message: '' });
	let dataTableRef = $state(null);

	function setFeedback(message, type = 'info') {
		feedback = { type, message };
	}

	function loadActiveDatabase() {
		try {
			const activeDb = getActiveDbConfig();
			dbInstance = getActiveDb();

			if (activeDb && dbInstance) {
				activeDbName = activeDb.localDatabase;
			} else {
				activeDbName = '';
				dbInstance = null;
				setFeedback(
					'No hay ninguna base de datos activa seleccionada. Configura una en Ajustes.',
					'warning'
				);
			}
		} catch (e) {
			setFeedback('Error al cargar la base de datos activa: ' + e.message, 'error');
		}
	}

	async function deleteNote(note) {
		if (!confirm(`¿Seguro que deseas eliminar la nota "${note.Asunto}"?`)) return;
		try {
			await dbInstance.remove(note);
			setFeedback(`Nota "${note.Asunto}" eliminada con éxito.`, 'success');
			if (dataTableRef) {
				dataTableRef.loadData();
			}
		} catch (e) {
			setFeedback('Error al eliminar nota: ' + e.message, 'error');
		}
	}

	onMount(() => {
		loadActiveDatabase();

		const handleDbChange = () => {
			loadActiveDatabase();
		};
		window.addEventListener('database-changed', handleDbChange);
		window.addEventListener('database-updated', handleDbChange);
		return () => {
			window.removeEventListener('database-changed', handleDbChange);
			window.removeEventListener('database-updated', handleDbChange);
		};
	});
</script>

{#if feedback.message}
	<p class="status-banner {feedback.type}">{feedback.message}</p>
{/if}

{#if dbInstance}
	<div class="flex-header">
		<h1>Notas</h1>
		<div class="top-actions">
			<LinkButton href="/notes/_new" icon={mdiNotePlus} label="Nueva Nota" background="#2a4f90" />
		</div>
	</div>

	{#key dbInstance}
		<DataTable
			bind:this={dataTableRef}
			{dbInstance}
			startkey="notas:"
			endkey={'notas:\uffff'}
			searchFields={['Asunto', 'Contenido', 'Autor']}
			sortByFields={[{ label: 'Asunto', key: 'Asunto' }]}
			columns={[
				{ label: 'Asunto', key: 'Asunto', sortable: true },
				{ label: 'Autor', key: 'Autor' },
				{ label: 'Acciones', key: 'actions', align: 'right' }
			]}
		>
			{#snippet rowSnippet(note)}
				<DataListRow
					iconHref={`/notes/${encodeURIComponent(note._id.split(':')[1])}`}
					iconLabel={`Abrir ${note.Asunto}`}
				>
					{#snippet icon()}
						{#if note.Autor}
							{#await dbInstance.get( note.Autor.startsWith('personas:') ? note.Autor : `personas:${note.Autor}`, { attachments: true } ) then persona}
								{#if persona._attachments && persona._attachments.foto && persona._attachments.foto.data}
									<img
										src={'data:' +
											persona._attachments.foto.content_type +
											';base64,' +
											persona._attachments.foto.data}
										alt={persona.data.Nombre || 'Desconocido'}
										width="70"
									/>
								{:else}
									<img
										src={genericAvatar}
										alt={persona.data.Nombre || 'Desconocido'}
										width="70"
									/>
								{/if}
							{:catch error}
								<SvgIcon path={mdiPencil} type="mdi" size="70px" />
							{/await}
						{:else}
							<img
								src={genericAvatar}
								alt="Desconocido"
								width="70"
							/>
						{/if}
					{/snippet}
					{#snippet content()}
						<div class="dl-field" role="cell">
							<small>Asunto</small>
							<a href={`/notes/${encodeURIComponent(note._id.split(':')[1])}`} class="note-link">
								<b>{note.Asunto}</b>
							</a>
						</div>
						<div class="dl-field" role="cell">
							<small>Autor</small>
							<!-- Get persona from DB -->
							{#if note.Autor}
								{#await dbInstance.get( note.Autor.startsWith('personas:') ? note.Autor : `personas:${note.Autor}`, { attachments: false } ) then persona}
									<span>{persona.data.Nombre || 'Desconocido'}</span>
								{:catch error}
									<span>¡Error!</span>
								{/await}
							{:else}
								<span>Desconocido</span>
							{/if}
						</div>
					{/snippet}
					{#snippet actions()}
						<a
							class="button mini-btn"
							href={`/notes/${encodeURIComponent(note._id.split(':')[1])}`}
						>
							<SvgIcon path={mdiPencil} type="mdi" size="1.2em" />
						</a>
						<button class="button danger mini-btn" onclick={() => deleteNote(note)}>
							<SvgIcon path={mdiDelete} type="mdi" size="1.2em" />
						</button>
					{/snippet}
				</DataListRow>
			{/snippet}
		</DataTable>
	{/key}
{:else}
	<div class="no-db-warning">
		<p>
			Por favor, ve a la página de Ajustes de Base de Datos para registrar y activar una base de
			datos local PouchDB.
		</p>
		<a href="/settings/database" class="button">Ir a Ajustes de Base de Datos</a>
	</div>
{/if}
