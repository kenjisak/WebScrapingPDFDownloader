const Crawler = require("crawler");
const fs = require("fs");
const axios = require("axios");
const path = require('path');

const visitedLinks = new Set();

const c = new Crawler({
    maxConnections : 10, //use this for parallel, rateLimit for individual
    //rateLimit: 1000,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            let $ = res.$; //get cheerio data, see cheerio docs for info
            let links = $("a") //get all links from page

            
            $(links).each(function(i, link){
                //Log out links
                var websiteLink = $(link).attr('href');
                var websiteLinkTitle = $("title").text();
                if(websiteLink != undefined){
                    if(websiteLink.includes(".pdf")){
                        // console.log("Title: " + websiteLinkTitle);
                        // console.log(websiteLinkTitle + ':  ' + websiteLink);
                        visitedLinks.add(websiteLink);
                    }
                }
                
                
            });
        }

        done();
    }
});

// Function to download the PDF
const downloadPDF = async (pdfUrl, folderName, fileName) => {
    try {
        // Make sure the folder exists, create it if it doesn't
        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName, { recursive: true });
        }

        // Determine the full file path
        const filePath = path.join(folderName, fileName);

        // Make a GET request to the PDF URL
        const response = await axios({
            method: 'GET',
            url: pdfUrl,
            responseType: 'stream' // Set the response type to 'stream' to handle binary data
        });

        // Create a writable stream and pipe the response data to it
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        // Wait for the file to be written completely
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log('PDF downloaded successfully');
        visitedLinks.delete(pdfUrl);//remove when downloaded successfully
    } catch (error) {
        console.error('Error downloading PDF:', error);
    }
};

//Perhaps a useful event
//Triggered when the queue becomes empty
//There are some other events, check crawler docs
c.on('drain',async function(){
    console.log("Done.");
    // while(visitedLinks.size != 0){//keep trying until they all download
    visitedLinks.forEach(async link => {
        var linkCopy = link.toLowerCase();
        if(linkCopy.includes("application") || linkCopy.includes("form") || linkCopy.includes("faq") || linkCopy.includes("guideline")){
            visitedLinks.delete(link);
        }else{
            var fileName = link.split("/");
            fileName = fileName[fileName.length - 1];
            console.log(fileName);
    
            downloadPDF(link,"allPDFs",fileName);
        }
    });       
    // }    
    
    
    console.log("Links Downloaded Size: ",visitedLinks.size);
});

//Queue a URL, which starts the crawl
c.queue('https://carleton.ca/law/course-outlines-fall-winter-2019-2020/');