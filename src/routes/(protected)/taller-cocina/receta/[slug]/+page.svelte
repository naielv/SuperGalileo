<script>
	let { data } = $props();

	function instructionText(instruction) {
		return typeof instruction === 'string' ? instruction : instruction?.text ?? '';
	}
</script>

<svelte:head><title>{data.recipe.name} · Taller de cocina</title></svelte:head>

<article class="recipe-page">
	<a class="back" href="/taller-cocina">← Volver al mapa de recetas</a>
	<header>
		<p class="eyebrow">Briefing de misión</p>
		<h1>{data.recipe.name}</h1>
		{#if data.recipe.description}<p class="description">{data.recipe.description}</p>{/if}
		<div class="meta">
			{#if data.recipe.prepTime}<span>Preparación · {data.recipe.prepTime}</span>{/if}
			{#if data.recipe.totalTime}<span>Tiempo total · {data.recipe.totalTime}</span>{/if}
			{#if data.recipe.recipeYield}<span>Raciones · {data.recipe.recipeYield}</span>{/if}
		</div>
	</header>

	<div class="mission-bar"><strong>Sesión de cocina</strong><span>Lee la receta, reparte las tareas y prepara los ingredientes.</span><button onclick={() => window.print()}>Imprimir receta</button></div>

	<div class="recipe-content">
		<section><h2>Ingredientes</h2>{#if data.recipe.recipeIngredient?.length}<ul>{#each data.recipe.recipeIngredient as ingredient}<li>{ingredient.display ?? ingredient.note ?? ingredient}</li>{/each}</ul>{:else}<p>No hay ingredientes registrados.</p>{/if}</section>
		<section><h2>Preparación</h2>{#if data.recipe.recipeInstructions?.length}<ol>{#each data.recipe.recipeInstructions as instruction}<li>{instructionText(instruction)}</li>{/each}</ol>{:else}<p>No hay instrucciones registradas.</p>{/if}</section>
	</div>
</article>

<style>
	:global(section.content) { padding: 0 !important; }.recipe-page { min-height: 100%; max-width: 1050px; margin: auto; padding: clamp(22px, 5vw, 60px); color: #30241e; }.back { color: #aa482d; font-weight: 800; text-decoration: none; }.eyebrow { margin: 40px 0 8px; color: #aa482d; font-size: .75rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }h1 { max-width: 800px; margin: 0; font-size: clamp(2.5rem, 7vw, 6rem); line-height: .9; letter-spacing: -.06em; }.description { max-width: 680px; color: #806c5e; font-size: 1.15rem; }.meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; }.meta span { padding: 7px 10px; border-radius: 99px; background: #f2dfd0; color: #806c5e; font-size: .8rem; }.mission-bar { display: flex; align-items: center; gap: 15px; margin: 30px 0; padding: 17px 20px; border-radius: 12px; background: #3b5c43; color: white; }.mission-bar strong { color: #f4b16f; font-size: 1.4rem; }.mission-bar span { flex: 1; }.mission-bar button { border: 1px solid #b9d09f; border-radius: 7px; padding: 8px 12px; background: transparent; color: white; cursor: pointer; }.recipe-content { display: grid; grid-template-columns: minmax(220px, .75fr) minmax(0, 1.25fr); gap: 30px; }.recipe-content section { padding: 25px; border: 1px solid #ead8ca; border-radius: 15px; background: #fffaf5; }.recipe-content h2 { margin-top: 0; font-size: 1.5rem; }.recipe-content li { margin: 0 0 12px; line-height: 1.5; }.recipe-content ol li::marker { color: #aa482d; font-weight: 900; }.recipe-content p { color: #806c5e; }@media (max-width: 700px) { .recipe-content { grid-template-columns: 1fr; }.mission-bar { align-items: start; flex-wrap: wrap; }.mission-bar span { flex-basis: 70%; }.mission-bar button { margin-left: auto; } }
	.recipe-page { max-width: none; min-height: 100%; background: #a9683f; background-image: linear-gradient(#8f542f1c 1px, transparent 1px), linear-gradient(90deg, #8f542f12 1px, transparent 1px); background-size: 34px 34px; }
	.recipe-page > header, .recipe-content, .mission-bar { max-width: 900px; margin-left: auto; margin-right: auto; }
	.recipe-page > header, .recipe-content section { border: 1px solid #b79562; background: #f5e7cb; box-shadow: 7px 10px 0 #542d1e66, inset 0 0 30px #d5b77f44; }
	.recipe-page > header { padding: 30px; transform: rotate(-.4deg); }
	.recipe-content section { border-radius: 2px; background: repeating-linear-gradient(0deg, #f5e7cb, #f5e7cb 31px, #dfc99f 32px); }
	.recipe-content section:first-child { transform: rotate(-1deg); }
	.recipe-content section:last-child { transform: rotate(1deg); }
	.mission-bar { border: 1px solid #2c402e; border-radius: 3px; box-shadow: 4px 7px 0 #3b251d66; }
	.back { display: inline-block; padding: 8px 11px; border-radius: 2px; background: #f7e58a; box-shadow: 3px 4px 0 #542d1e4d; transform: rotate(-1deg); }
</style>
