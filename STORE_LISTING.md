# Chrome Web Store Listing Requirements

## Required Information for Store Submission

### 1. Extension Details
- **Name**: "Paragraph Processor" (current: "Paragraph Counter" - should be more descriptive)
- **Description**: Clear, compelling description of functionality
- **Category**: "Tools" or "Productivity" (most appropriate)
- **Language**: English

### 2. Required Images
- **Icon (128x128)**: ✅ Present
- **Screenshots (1280x800 or 640x400)**: ❌ Missing
- **Promotional Tile (440x280)**: ❌ Missing
- **Marquee (1400x560)**: ❌ Missing

### 3. Privacy Information
- **Privacy Policy**: ✅ Created (PRIVACY.md)
- **Data Collection Disclosure**: ✅ Covered in privacy policy
- **Third-party Services**: ✅ Documented (NLP API)

### 4. Store Listing Content

#### Description (Recommended)
```
Paragraph Processor - Smart Text Analysis & NLP

Transform how you read and analyze text on any webpage with intelligent Natural Language Processing.

🔍 KEY FEATURES:
• Smart Noun Phrase Detection - Automatically identifies and highlights key concepts
• Word Count Analysis - The word count of any paragraph you hover
• Pin & Process - Pin important text for focused analysis
• Clean Interface - Non-intrusive hover-based interaction
• Privacy-First - Your data stays secure, no permanent storage

🎯 PERFECT FOR:
• Students analyzing academic texts
• Researchers reviewing documents
• Writers checking content structure
• Anyone who wants deeper text understanding

⚡ HOW IT WORKS:
1. Hover over any paragraph to see word count
2. Click Pin to process the paragraph with NLP
3. Watch as noun phrases are highlighted automatically
4. Toggle NLP processing on/off in settings

🔒 PRIVACY & SECURITY:
• Text processing happens on secure servers
• No permanent data storage
• HTTPS encryption for all communications
• Local caching for performance

Install Paragraph Processor today and unlock the power of intelligent text analysis!
```

#### Short Description
```
Smart text analysis with NLP-powered noun phrase detection and word counting for any webpage.
```

### 5. Category Selection
**Recommended Category**: "Tools"
- Fits the utility nature of the extension
- Covers text processing and analysis tools
- Appropriate for the target audience

### 6. Permissions Justification
Current permissions are appropriate:
- `storage`: Required to save user preferences
- `host_permissions`: The NLP API's origin, which the background worker calls; the build sets it from `API_BASE_URL`
- The content script's `<all_urls>` match: Required to add the paragraph overlay on any page. Chrome also counts it as host access to every site, so the worker could reach the API without `host_permissions`; declaring the API origin keeps that access explicit if the content script's sites are ever narrowed

### 7. Testing Instructions
For Chrome Web Store reviewers:
```
TESTING INSTRUCTIONS:

1. Install the extension
2. Navigate to any webpage with text content (e.g., news article, blog post)
3. Hover over paragraphs to see word count functionality
4. Click the extension icon to open popup
5. Switch "Noun phrase highlighting" on
6. Hover a paragraph and click Pin on its tab to see NLP processing
7. Verify the sheet under the paragraph shows its noun phrases highlighted in yellow
8. Test on different types of content (articles, documentation, etc.)

Note: NLP processing requires the backend API to be running at the API_BASE_URL the extension was built with (default localhost:8080)
```

### 8. Screenshots Needed
Create these screenshots for store listing:
1. **Main functionality**: Extension popup with settings
2. **Text processing**: Webpage with highlighted noun phrases
3. **Hover interaction**: Word count display on hover
4. **Pin feature**: Pinned text with processing results

### 9. Promotional Images
- **Tile (440x280)**: Clean design showing extension icon and key features
- **Marquee (1400x560)**: Wide banner highlighting main benefits
- **Screenshots**: High-quality examples of the extension in action

## Next Steps for Store Submission

1. **Update extension name** to be more descriptive
2. **Create promotional images** (tile, marquee, screenshots)
3. **Write compelling description** using the template above
4. **Test thoroughly** on different websites
5. **Prepare privacy policy** (✅ Done)
6. **Submit for review** with complete listing information

## Compliance Checklist

- ✅ Manifest V3
- ✅ Privacy Policy
- ✅ Appropriate Permissions
- ✅ Security Best Practices
- ❌ Store Images (screenshots, tile, marquee)
- ❌ Compelling Description
- ❌ Testing Instructions
- ❌ Category Selection 