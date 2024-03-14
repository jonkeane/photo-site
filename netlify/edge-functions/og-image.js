export default async (request, context) => {
    const url = new URL(request.url)
    
    // Get the page content.
    const response = await context.next()
    const page = await response.text()
    
    // Only run if the s query parameter is set
    if (!url.searchParams.has("s")) {
        return;
    }

    const regex = /(<meta property="og:image" content=")(.*)(" \/>)/g;
    // Replace it with the path plus the querystring.
    const replace = "$1https://live.staticflickr.com/" + url.searchParams.get('s') + "$3";
    console.log(replace)
    return new Response(page.replaceAll(regex, replace), response);
}