<script>
	import { onMount } from 'svelte';
	import { getActiveDb } from '$lib/db';
	import userGenericIcon from '$lib/assets/user_generic.png';

	let { label = 'Persona', required = false, selected = $bindable(null) } = $props();

	let people = $state([]);
	let dbInstance = $state(null);
	let open = $state(false);

	const selectedForUi = $derived.by(() => {
		const selectedKey = selected?.key;
		if (!selectedKey) return selected;
		return people.find((option) => option?.key === selectedKey) || null;
	});

	const peopleByRegion = $derived.by(() => {
		const grouped = {};
		for (const person of people) {
			const region = person.region || 'Sin región';
			(grouped[region] ||= []).push(person);
		}
		return Object.entries(grouped).sort(([regionA], [regionB]) => regionA.localeCompare(regionB));
	});

	function selectPerson(person) {
		selected = person;
		open = false;
	}

	onMount(() => {
		dbInstance = getActiveDb();
		if (!dbInstance) return;

		dbInstance
			.allDocs({
				startkey: 'personas:',
				endkey: 'personas:\ufff0',
				include_docs: true,
				attachments: true
			})
			.then((result) => {
				people = result.rows
					.map((row) => {
						const data = row.doc?.data || row.doc;
						return {
							key: row.doc._id,
							label: data.Nombre || row.doc._id,
							region: data.Region || 'Sin región',
							image: row.doc._attachments?.foto
								? `data:${row.doc._attachments.foto.content_type};base64,${row.doc._attachments.foto.data}`
								: userGenericIcon
						};
					})
					.filter((person) => person !== null);
			})
			.catch(() => {});
	});
</script>

<details class="picker" class:required={required && selectedForUi === null}>
	<summary class="picker-summary" onclick={() => (open = !open)} aria-expanded={open}>
		<span class="picker-label">
			<img src={selectedForUi?.image || userGenericIcon} alt="" />
			{label}</span>
		<span class="summary-option">
			{#if selectedForUi}
				<span>{selectedForUi.label}</span>
			{/if}
		</span>
		<span class="chevron" aria-hidden="true">{selectedForUi ? '✓' : '⌄'}</span>
	</summary>

	{#if open}
		<div class="options" role="listbox" aria-label={label}>
			{#if people.length === 0}
				<p>No hay personas disponibles.</p>
			{:else}
				{#each peopleByRegion as [region, regionPeople]}
					<h3>{region}</h3>
					{#each regionPeople as person}
						<button
							type="button"
							class:selected={selectedForUi?.key === person.key}
							onclick={() => selectPerson(person)}
							role="option"
							aria-selected={selectedForUi?.key === person.key}
						>
							<img src={person.image} alt="" />
							<span>{person.label}</span>
						</button>
					{/each}
				{/each}
			{/if}
		</div>
	{/if}
</details>

<style>
	.picker {
		position: relative;
		width: 100%;
		border: 2px solid black;
		border-radius: 5px;
		overflow: hidden;
	}
	.picker-summary {
		width: 100%;
		/* min-height: 48px; */
        display: flex;
        justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding: 7px 10px;
		background: #fff;
		color: inherit;
		text-align: left;
		cursor: pointer;
		font-weight: 400;
	}
	.picker-label {
		font-size: 18px;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.picker-label img {
		width: 32px;
		height: 32px;
	}
	.summary-option {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		min-width: 0;
		font-size: 15px;
	}
	.summary-option > span:last-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.chevron {
		font-size: 22px;
		line-height: 1;
	}
	.options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 6px;
		padding: 8px;
		border-top: 1px solid black;
	}
	.options h3 {
		grid-column: 1 / -1;
		margin: 0;
		padding-top: 18px;
		padding-bottom: 0;
		font-size: 24px;
		text-align: center;
		border-top: 1px solid #cbd5e1;
	}
	.options h3:first-of-type {
		border-top: none !important;
		padding-top: 4px;
	}
	.options button {
		min-height: 64px;
		display: flex;
        flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 7px;
		border: 3px solid #aaa;
		background: #eeeeee;
		border-radius: 4px;
		color: inherit;
		cursor: pointer;
		text-align: left;
		border-radius: 17.5px;
	}
	.options button.selected {
		border-color: #d00;
		background: #fdd;
	}
    .options button span{
        text-align: center;
    }
	.options button img {
		width: 46px;
		height: 46px;
	}
</style>
