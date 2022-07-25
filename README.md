# hbbtv-lshape-demo
This sample app demonstrates serving L-Shape banner ads using standard Google Ad
Manager [tags](https://developers.google.com/publisher-tag/guides/get-started).
The ad is booked as a
[custom creative](https://support.google.com/admanager/answer/3180782?hl=en) in
[Google Ad Manager](https://admanager.google.com/intl/en_uk/home/). See
[sample](/assets/sample_creative.html) in the assets section.

The application listens to events set in the DVB stream to trigger the ad request.

Key features:
* stream event triggers the ad request and defines the creative’s display duration and targeting
* creative’s display duration can be set in the creative itself (using the window.postMessage API) to safely enable communication between the creative served in an iframe and the HbbTV application
* supports passing a targeting object in the stream event. Example: `{"type" :"adBreakTrigger", "duration": 5, "targeting": {"key1": "value1", "key2": "value2"}}`

## Broadcast stream modulation
This application has been developed and tested using the [Beebee Box](https://site.vizionr.fr/site/index.php/offre-hbbtv/) for DVB modulation. The XML file containing the HbbTV stream events is looking as the following:
```
<?xml version="1.0" encoding="UTF-8"?>
<events>
  <event timestamp="00:00:33:000" value='{"type":"adBreakTrigger", "duration": 10, "targeting": {"key1":"value1", "key2":"value2"}}'/>
  <event timestamp="00:01:47:590" value='{"type":"adBreakTrigger", "duration": 15, "targeting": {"key1":"value2"}}'/>
</events>
```

## Test
You can use the [HybridTV Dev Environment Chrome Extension](https://chrome.google.com/webstore/detail/hybridtv-dev-environment/ljmkgjilkcmdokbgofbmjnkobejhhapc) to emulate a HbbTV environment. Pages served with mime type `application/vnd.hbbtv.xhtml+xml` enable the extension.

You can trigger stream events directly from the Chrome extension as follows:

*   streamEvent name => `eventItem`
*   streamEvent data => leave empty
*   streamEvent text => `{"type":"adBreakTrigger", "duration": 10,
    "targeting": {"key1":"value1", "key2":"value2"}}`
