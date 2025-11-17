import { ArrowRightIcon } from "@radix-ui/react-icons";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface ListItem {
  icon: React.ReactNode;
  title: string;
  category: string;
  description: string;
  link: string;
  subtitle?: string;
}

interface List2Props {
  heading?: string;
  items?: ListItem[];
}

export const List2 = ({
  heading = "Tasks",
  items = [
  ],
}: List2Props) => {
  return (
    <section>
      <div className="container mx-auto px-0 md:px-8">
        <h1 className="mb-10 px-4 text-3xl font-semibold md:mb-14 md:text-4xl">
          {heading}
        </h1>
        <p className="mb-10 px-4 text-sm text-muted-foreground">
          We value your feedback, fill out this form to help us improve <a className="text-blue-500" href="https://forms.gle/1234567890" target="_blank" rel="noopener noreferrer">here</a>
        </p>
        <div className="flex flex-col">
          <Separator />
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <a href={item.link} className="block hover:bg-muted/50 transition-colors">
                <div className="grid items-center gap-4 px-4 py-5 md:grid-cols-5">
                  <div className="order-2 flex items-center gap-2 md:order-none">
                    <span className="flex h-32 w-32 shrink-0 items-center justify-center rounded-md bg-muted">
                      {item.icon}
                    </span>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.category}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <p className="order-1 text-xl font-semibold md:order-none md:col-span-2">
                    {item.description}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="order-4 md:order-none" onClick={(e) => e.stopPropagation()}>
                        Follow-up Tasks
                        <ChevronDownIcon className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        Test in wet lab
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Add to project
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Send report to slack
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="order-3 ml-auto w-fit gap-2 md:order-none">
                    <span className="text-sm text-muted-foreground">View insights</span>
                    <ArrowRightIcon className="h-4 w-4 inline ml-1" />
                  </div>
                </div>
              </a>
              <Separator />
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
