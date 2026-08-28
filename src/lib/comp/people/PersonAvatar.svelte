<script>
	import userGenericIcon from '$lib/assets/user_generic.png';

	let { person, size = "40px", alt = '' } = $props();

	let imageSource = $derived(
		person?._attachments?.foto
			? `data:${person._attachments.foto.content_type};base64,${person._attachments.foto.data}`
			: userGenericIcon
	);
</script>

<img src={imageSource} {alt} class="avatar" style:width={size} />
<style>
	.avatar {
		height: 100%;
		object-fit: contain;
	}
</style>