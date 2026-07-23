import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { schemas } from "../../generated.api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "../hooks/useApiClient"
import { useOrchards } from "@/hooks/useOrchards"
import { Copy, Check } from "lucide-react"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet"

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied by the browser; the value is still
      // visible in the field for manual copy.
    }
  }

  return (
    <div>
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border bg-muted px-3 py-1.5 text-sm break-all">
          {value}
        </code>
        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  )
}

function CreateStation() {
  type FormData = z.infer<typeof schemas.StationCreate>
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const { data: orchards } = useOrchards()

  const form = useForm<FormData>({
    resolver: zodResolver(schemas.StationCreate),
    defaultValues: {
      name: "",
      orchard_id: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (newStation: FormData) => {
      return apiClient.createStation(newStation)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchard", "list"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  if (mutation.isSuccess) {
    const credentials = mutation.data
    return (
      <SheetHeader>
        <SheetTitle className="mb-1">"{credentials.name}" created</SheetTitle>
        <SheetDescription asChild>
          <div className="space-y-6">
            <p className="text-sm">
              Provision the physical device with these values now — the AppKey
              is shown only this once and can't be retrieved again later.
            </p>
            <div className="space-y-4">
              <CopyLine label="AT+DEVEUI" value={`AT+DEVEUI=${credentials.device_id}`} />
              <CopyLine label="AT+APPEUI" value={`AT+APPEUI=${credentials.app_eui}`} />
              <CopyLine label="AT+APPKEY" value={`AT+APPKEY=${credentials.app_key}`} />
            </div>
          </div>
        </SheetDescription>
      </SheetHeader>
    )
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="mb-4">Create a Station</SheetTitle>
        <SheetDescription asChild>
          <Form {...form}>
            <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      This your personal name for the Device
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orchard_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orchard</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="file:text-foreground placeholder:text-muted-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                      >
                        <option value="" disabled>
                          Select an orchard
                        </option>
                        {orchards?.map((orchard) => (
                          <option key={orchard.id} value={orchard.id}>
                            {orchard.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        </SheetDescription>
      </SheetHeader>
    </>
  )
}

export default CreateStation
