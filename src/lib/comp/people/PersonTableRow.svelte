<script>
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiDelete, mdiPencil } from '@mdi/js';
	import PersonAvatar from './PersonAvatar.svelte';
	import PersonBadges from './PersonBadges.svelte';
	import DataListRow from '$lib/comp/DataListRow.svelte';
	import { m } from '$lib/paraglide/messages';

	let { person, onDelete } = $props();

	let personId = $derived(encodeURIComponent(person._id.split(':')[1]));
</script>

<DataListRow
	className="person-row row"
	iconHref={`/people/${personId}`}
	iconLabel={`Abrir ${person.Nombre}`}
>
	{#snippet icon()}
		<PersonAvatar {person} alt={person.Nombre} size="70px" />
	{/snippet}
	{#snippet content()}
		<div class="dl-field" role="cell">
			<small>Nombre</small>
			<b>{person.Nombre}</b>
		</div>
		<div class="dl-field" role="cell">
			<small>Aula</small>
			<b>{person.Region}</b>
		</div>
		<div class="dl-field" role="cell">
			<small>Saldo</small>
			<span class="balance {person.Monedero_Balance < 0 ? 'negative' : 'positive'}">
				{Number(person.Monedero_Balance || 0).toFixed(2)} €
			</span>
		</div>
		{#if person.Oculto || (person.Roles && person.Roles.split(',').includes('ADMIN'))}
			<div class="dl-field" role="cell">
				<small>Otros datos</small>
				{#if person.Oculto}
					<span >{m.hidden()}</span>
				{/if}
				{#if person.Roles && person.Roles.split(',').includes('ADMIN')}
					<span>{m.admin()}</span>
				{/if}
			</div>
		{/if}
	{/snippet}
	{#snippet actions()}
		<a class="button mini-btn" href={`/people/${personId}`} aria-label="Editar persona">
			<SvgIcon path={mdiPencil} type="mdi" size="1.75em" />
		</a>
		<button class="button danger mini-btn" onclick={() => onDelete?.(person)} aria-label="Eliminar persona">
			<SvgIcon path={mdiDelete} type="mdi" size="1.75em" />
		</button>
	{/snippet}
</DataListRow>
