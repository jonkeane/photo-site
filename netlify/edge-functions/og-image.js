export default async (request, context) => {
    const url = new URL(request.url)
    
    // Get the page content.
    const response = await context.next()
    const page = await response.text()
    
    // Look for the OG image generator path.
    const search = 'static_og'
    // Replace it with the path plus the querystring.
    const replace = 'https://live.staticflickr.com/' + url.searchParams.get('s')

    return new Response(page.replaceAll(search, replace), response);
}